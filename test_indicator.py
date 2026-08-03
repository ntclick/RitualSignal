import asyncio
import json
import time
import sys
import os
import requests
import numpy as np

# Ensure UTF-8 output encoding for Windows PowerShell
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ritual Chain Config
RPC_URL = "https://rpc.ritualfoundation.org"
CHAIN_ID = 1979
ORACLE_ADDRESS = "0x92C5e233f529C0c8Cf8CB4c538907c6579021971"
PRIVATE_KEY = "0x2c3daa7fd43bcb61851e1b186fcfdb539816b80e3b4a6602de65e28496f92f0f"

def fetch_binance_klines(symbol="BTCUSDT", interval="4h", limit=100):
    """Fetches real-time OHLCV kline data from Binance API."""
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    res.raise_for_status()
    data = res.json()
    
    closes = np.array([float(k[4]) for k in data])
    highs = np.array([float(k[2]) for k in data])
    lows = np.array([float(k[3]) for k in data])
    volumes = np.array([float(k[5]) for k in data])

    return {
        "symbol": symbol,
        "closes": closes,
        "highs": highs,
        "lows": lows,
        "volumes": volumes,
        "current_price": closes[-1]
    }

def calculate_rsi(closes, period=14):
    """Calculates Relative Strength Index (RSI)."""
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100.0 - (100.0 / (1.0 + rs)), 2)

def calculate_ema(closes, span):
    """Calculates Exponential Moving Average (EMA)."""
    alpha = 2 / (span + 1)
    ema = closes[0]
    for price in closes[1:]:
        ema = (price * alpha) + (ema * (1 - alpha))
    return round(ema, 2)

def run_single_indicator_test(symbol="BTC"):
    print("=" * 70)
    print(f"[STEP 1] Fetching Live Binance OHLCV Data for {symbol}/USDT...")
    print("=" * 70)

    binance_pair = f"{symbol}USDT"
    data = fetch_binance_klines(symbol=binance_pair, interval="4h", limit=100)
    closes = data["closes"]

    current_price = data["current_price"]
    rsi = calculate_rsi(closes, period=14)
    ema9 = calculate_ema(closes, 9)
    ema20 = calculate_ema(closes, 20)
    ema50 = calculate_ema(closes, 50)

    print(f"[DATA] Current Price: ${current_price:,.2f}")
    print(f"[DATA] RSI(14): {rsi} ({'Overbought (>70)' if rsi > 70 else 'Oversold (<30)' if rsi < 30 else 'Neutral/Bullish (40-70)'})")
    print(f"[DATA] EMA Stack: EMA9=${ema9:,.2f} | EMA20=${ema20:,.2f} | EMA50=${ema50:,.2f}")
    
    trend = "Bullish" if ema9 > ema20 > ema50 else "Bearish" if ema9 < ema20 < ema50 else "Sideways"
    print(f"[DATA] Technical Alignment: {trend} Trend")

    print("\n" + "=" * 70)
    print("[STEP 2] Executing LLM Precompile (0x0802) on Ritual Chain (ID 1979)...")
    print("=" * 70)

    sys.path.append("backend")
    from ritual_client import RitualClient

    client = RitualClient(rpc_url=RPC_URL, private_key=PRIVATE_KEY)

    system_prompt = (
        "You are an AI Quantitative Trading Oracle running inside a Trusted Execution Environment (TEE) on Ritual Chain.\n"
        "Analyze the provided cryptocurrency market data and return ONLY a strict JSON object:\n"
        "{\n"
        '  "verdict": "<Long|Short|Neutral|Skip>",\n'
        '  "confidence": <int 0-100>,\n'
        '  "expert_summary": "<1 sentence thesis citing specific indicator values>",\n'
        '  "supporting": ["<evidence 1>", "<evidence 2>"],\n'
        '  "counterpoint": "<concrete risk>",\n'
        '  "invalidation": "<exact price level or threshold>",\n'
        '  "trade": {"entry": <number>, "takeProfit": <number>, "stopLoss": <number>, "riskReward": <number>},\n'
        '  "source": "Binance OHLCV Klines",\n'
        '  "source_type": "Ritual LLM Precompile (0x0802 TEE Enclave)"\n'
        "}\n"
    )

    market_summary = (
        f"Pair: {symbol}/USDT | Timeframe: 4H | Indicator Test: RSI + EMA Stack\n"
        f"Current Price: ${current_price:,.2f} | RSI(14): {rsi}\n"
        f"EMA Stack: {trend} (EMA9=${ema9:,.2f}, EMA20=${ema20:,.2f}, EMA50=${ema50:,.2f})\n"
    )

    print("[PROMPT] Prompt Sent to TEE Enclave:")
    print(market_summary)

    llm_payload = client.encode_llm_payload(
        prompt=system_prompt,
        market_summary=market_summary,
        ttl_blocks=300
    )

    request_id = f"test_ind_{int(time.time())}"
    
    with open("contracts/SignalOracle.json", "r") as f:
        oracle_json = json.load(f)
        oracle_abi = oracle_json.get("abi", oracle_json)

    raw_tx_hash, latency = client.execute_oracle_evaluate(
        oracle_address=ORACLE_ADDRESS,
        oracle_abi=oracle_abi,
        llm_payload=llm_payload,
        request_id=request_id,
        symbol=symbol,
        pair=f"{symbol}/USDT"
    )

    tx_hash = raw_tx_hash if raw_tx_hash.startswith("0x") else "0x" + raw_tx_hash

    print(f"[TX] Tx Broadcasted! Tx Hash: {tx_hash} (Latency: {latency} ms)")
    print("[POLL] Waiting for TEE Enclave settlement on Ritual Chain...")

    # Poll status until settled
    for attempt in range(1, 20):
        time.sleep(3)
        receipt = client.w3.eth.get_transaction_receipt(tx_hash)
        if receipt:
            spc_res = client.parse_spc_calls_output(dict(receipt))
            if spc_res:
                if spc_res.get("error"):
                    print(f"   Attempt {attempt}: TEE Node Note -> {spc_res.get('errorMessage')}")
                else:
                    raw_text = spc_res.get("rawText", "")
                    start, end = raw_text.find("{"), raw_text.rfind("}")
                    if start != -1 and end != -1:
                        result_json = json.loads(raw_text[start:end+1])
                        print("\n" + "=" * 70)
                        print("[STEP 3] TEE ENCLAVE SETTLED ON-CHAIN RESULT!")
                        print("=" * 70)
                        print(f"Verdict: {result_json.get('verdict')} ({result_json.get('confidence')}% Confidence)")
                        print(f"Thesis: {result_json.get('expert_summary')}")
                        print(f"Target Entry: ${result_json.get('trade', {}).get('entry')}")
                        print(f"Take Profit: ${result_json.get('trade', {}).get('takeProfit')}")
                        print(f"Stop Loss: ${result_json.get('trade', {}).get('stopLoss')}")
                        print(f"Explorer Link: https://explorer.ritualfoundation.org/tx/{tx_hash}")
                        print("=" * 70)
                        return result_json
        print(f"   Attempt {attempt}: Awaiting block inclusion...")

    print("Settlement polling timed out. Check explorer for final state.")

if __name__ == "__main__":
    run_single_indicator_test(symbol="BTC")

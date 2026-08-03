# ⚡ RitualSignal: Decentralized AI Trading Oracle on Ritual Chain (formerly GenSignal)

> Trustless AI Consensus Trading Intelligence with **Micropayments** on **Ritual Chain**.

---

## 🌐 Live Demo & Deployment Links

- 🚀 **Live Frontend dApp (Vercel)**: [https://gensignal.vercel.app](https://gensignal.vercel.app)
- ⚡ **Live Backend API (Render Cloud 24/7)**: [https://gensignal.onrender.com](https://gensignal.onrender.com)
- ⛓️ **GenLayer Testnet Explorer**: [https://explorer.testnet-chain.genlayer.com](https://explorer.testnet-chain.genlayer.com)

---

## 📌 Problem & Solution

Traditional crypto trading signals suffer from zero accountability: telegram callers, centralized API providers, and opaque bots frequently alter history or hide bad calls.

**RitualSignal** introduces a transparent, trustless paradigm:
- **On-Chain Settlement**: Traders pay a micro-fee (`0.05 RITUAL`) directly via smart contracts on Ritual Chain.
- **Ritual TEE Execution**: TEE Enclave nodes inspect real-time exchange candle data, compute technical indicators on-chain, and execute AI reasoning inside isolated enclaves before committing state.
- **Senior Quant Desk Thesis**: Powered by **GLM-4.7-FP8**, returning sharp, numerical 2-sentence executive briefs backed by empirical market metrics.

---

## 🌟 Key Features

### 1. 💸 Micropayment Engine
- Direct on-chain fee payment (`0.05 RITUAL`) settled via `SignalTreasury` smart contracts.
- Generates 66-character lowercase hex transaction hashes linking straight to [Ritual Chain Explorer](https://explorer.ritualfoundation.org).

### 2. 🧠 Ritual TEE Execution Node
- Smart Contracts deployed to **Ritual Chain Testnet** (`Chain ID: 1979`).
- Adjudicates trade validity across TEE Enclave nodes (`0x0802` precompile).
- Adjudicates trade validity across multiple AI-Validator nodes using optimistic democracy voting.

### 3. ⏱️ Multi-Timeframe Execution Desk
- Multi-timeframe execution selection: **15m Scalp**, **1h Intraday**, **4h Swing**, **1d Position**.
- Dual kline fetching: combines short-term execution candles with 14-day macro market trend context.

### 4. 📈 8 Technical Strategy Engines
1. **Trading Signals (RSI/EMA)**: RSI(14) expansion, MACD cross, EMA 50 & 200 trend alignment.
2. **Market Structure (BOS/CHOCH)**: Break of Structure vs Change of Character analysis.
3. **Order Block / FVG Zones**: Fair Value Gap & Smart Money Concepts zone scanning.
4. **Liquidity / Stop-Hunt Map**: Equal Highs/Lows and liquidity pool sweep identification.
5. **Bollinger Bands & Squeeze**: Volatility compression & expansion breakout scan.
6. **SuperTrend & ATR Breakout**: Average True Range trailing stop & trend following.
7. **MACD Divergence & Cross**: Zero-line crossovers & bullish/bearish divergences.
8. **Volume Profile & VWAP POC**: Volume Point of Control & VWAP mean reversion zones.

### 5. 🐕 23 Supported Assets & Memecoins
- Major Coins: `BTC`, `ETH`, `SOL`, `BNB`, `AVAX`, `LINK`, `SUI`, `NEAR`, `APT`, `RENDER`, `INJ`, `FET`, `TIA`, `SEI`, `OP`, `ARB`.
- High-Precision Memecoins: `PEPE`, `SHIB`, `BONK`, `FLOKI`, `NEIRO`, `DOGE`, `WIF` formatted up to **10 decimal places** (`$0.0000027100`).

---

## 🏗️ Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                  GenSignal Web3 Frontend                   │
 │             (React + Vite + MetaMask EIP-712)              │
 └──────────────────────────────┬──────────────────────────────┘
                                │ 1. Sign & Execute (x402)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               GenSignal FastAPI Backend Server              │
 │        (Python 3.11 + GenLayer SDK + Binance Klines)        │
 └──────────────┬──────────────────────────────┬───────────────┘
                │                              │
 2. Micropayment│                              │ 3. Quant AI Desk
                ▼                              ▼
 ┌──────────────────────────────┐ ┌───────────────────────────┐
 │   SignalTreasury Contract    │ │  Groq LLaMA 3.3 70B Engine│
 │  (GenLayer Bradbury Testnet) │ │(Data-Backed Quant Summary)│
 └──────────────┬───────────────┘ └─────────────┬─────────────┘
                │                               │
                └───────────────┬───────────────┘
                                │ 4. Deploy & Adjudicate
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │              GenLayer Optimistic Democracy                 │
 │         (GenVM Multi-Validator AI Consensus Nodes)          │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Local Development Setup

### Prerequisites
- **Python**: `3.11` or `3.13`
- **Node.js**: `v18+`
- **GenLayer SDK**: `genlayer-py>=0.13.0`

### 1. Clone Repository
```bash
git clone https://github.com/ntclick/GenSignal.git
cd GenSignal
```

### 2. Backend Setup
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run FastAPI backend server on port 8001
py -3.13 -m uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access local dApp at `http://localhost:3001`.

---

## 📄 Smart Contracts

- `contracts/signal_treasury.py`: Handles x402 0.05 GEN fee payments and owner withdrawal logic.
- `contracts/signal_oracle.py`: Intelligent Contract implementing on-chain signal evaluation and consensus storage.

---

## 📜 License

MIT License. Built for the GenLayer Ecosystem.

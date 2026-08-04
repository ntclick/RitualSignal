import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import build_quant_rubric_signal

def test_local_backend():
    print("=" * 70)
    print("TESTING LOCAL BACKEND QUANT RUBRIC SIGNAL GENERATOR")
    print("=" * 70)

    # Test Quant Rubric signal generation
    print("\n1. Testing Quant Rubric Signal Generation...")
    quant_sig = build_quant_rubric_signal(
        symbol="BTC",
        pair="BTC/USDT",
        timeframe="4h",
        strategy="RSI + EMA Stack",
        last_price=63699.47,
        rsi_14=58.4,
        ema_trend="Bullish stack (price > EMA9 > EMA20 > EMA50)",
        rvol=1.45,
        atr_14=1240.50
    )
    print("   Generated Quant Signal:")
    print(json.dumps(quant_sig, indent=2))

    assert quant_sig["verdict"] in ["Long", "Short", "Neutral"]
    assert quant_sig["confidence"] > 0
    assert "trade" in quant_sig
    print("\n[OK] Local Backend Logic Test Passed 100%!")
    print("=" * 70)

if __name__ == "__main__":
    test_local_backend()

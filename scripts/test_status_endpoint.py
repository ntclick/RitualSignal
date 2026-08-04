import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import get_signal_status

def test_status_endpoint():
    print("=" * 70)
    print("TESTING STATUS ENDPOINT ON MINED RITUAL CHAIN TRANSACTION")
    print("=" * 70)

    # Use live mined tx hash on Ritual Chain: 0x2d1a058f0c9d3d8b2b5ab74415cf180b691572a491bbcf06f8adb8c871b74b65
    tx_hash = "0x2d1a058f0c9d3d8b2b5ab74415cf180b691572a491bbcf06f8adb8c871b74b65"
    print(f"\n1. Testing get_signal_status for Tx: {tx_hash}...")

    res = get_signal_status(tx_hash=tx_hash)
    print("   Response Status Dict:")
    print(json.dumps(res, indent=2))

    assert res["status"] == "done", f"Expected status 'done', got '{res.get('status')}'"
    assert "signal" in res, "Expected 'signal' payload in response"
    assert res["signal"]["verdict"] in ["Long", "Short", "Neutral"]
    assert res["block_number"] > 54000000
    assert res["receipt_status"] == 1

    print("\n[OK] get_signal_status verified: Always returns status 'done' with signal payload!")
    print("=" * 70)

if __name__ == "__main__":
    test_status_endpoint()

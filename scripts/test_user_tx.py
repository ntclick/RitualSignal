import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import get_signal_status

def test_user_tx():
    tx_hash = "0xf0c97f2655c1a8c36fadae7a46bf597ee87ffe4e00d4fa4ed595b6540112d758"
    print(f"Testing get_signal_status for Tx: {tx_hash}...")

    res = get_signal_status(tx_hash=tx_hash)
    print("get_signal_status response:")
    print(json.dumps(res, indent=2))

    assert res["status"] == "done"
    assert "signal" in res

if __name__ == "__main__":
    test_user_tx()

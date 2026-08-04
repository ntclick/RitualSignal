import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import get_ritual_client

def inspect_tx():
    tx_hash = "0x7f3bfa29b6d8fb8836903454367a143cde4269e0cc8e2584c413ea75472b306b"
    print("=" * 70)
    print(f"INSPECTING TRANSACTION: {tx_hash}")
    print("=" * 70)

    client = get_ritual_client()

    tx = client.w3.eth.get_transaction(tx_hash)
    print("\n1. Transaction Details:")
    print(f"   From:     {tx.get('from')}")
    print(f"   To:       {tx.get('to')}")
    print(f"   Value:    {tx.get('value')} wei")
    print(f"   Block:    {tx.get('blockNumber')}")
    print(f"   Gas:      {tx.get('gas')}")
    print(f"   GasPrice: {tx.get('gasPrice')} wei")

    try:
        receipt = client.w3.eth.get_transaction_receipt(tx_hash)
        print("\n2. Transaction Receipt Details:")
        print(f"   Status:   {receipt.get('status')} ({'SUCCESS (1)' if receipt.get('status') == 1 else 'FAILED/REVERTED (0)'})")
        print(f"   Gas Used: {receipt.get('gasUsed')}")

        spc_result = client.parse_spc_calls_output(dict(receipt))
        print(f"\n3. SPC Calls Output:")
        print(json.dumps(spc_result, indent=2))
    except Exception as e:
        print(f"   Receipt Fetch Error: {e}")

    print("=" * 70)

if __name__ == "__main__":
    inspect_tx()

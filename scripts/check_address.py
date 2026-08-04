import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from eth_utils import to_checksum_address
from backend.app import get_ritual_client

def check_address():
    target = to_checksum_address("0xCc5495dF16633c0D0C189a71Ed3A723C2687dAE1")
    print("=" * 70)
    print(f"CHECKING ADDRESS: {target}")
    print("=" * 70)

    client = get_ritual_client()

    code = client.w3.eth.get_code(target)
    balance = client.w3.eth.get_balance(target)
    tx_count = client.w3.eth.get_transaction_count(target)

    print(f"\n1. Basic Properties:")
    print(f"   Address:           {target}")
    print(f"   Is Smart Contract: {'YES (Bytecode length: ' + str(len(code)) + ' bytes)' if len(code) > 0 else 'NO (EOA Wallet)'}")
    print(f"   Balance:           {client.w3.from_wei(balance, 'ether')} RITUAL")
    print(f"   Nonce / Tx Count:  {tx_count}")

    if len(code) > 0:
        print(f"\n2. Bytecode Hex Snippet:")
        print(f"   0x{code.hex()[:100]}...")

    print("=" * 70)

if __name__ == "__main__":
    check_address()

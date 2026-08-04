import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from eth_utils import to_checksum_address
from backend.app import get_ritual_client

def test_official_registry():
    print("=" * 70)
    print("TESTING OFFICIAL RITUAL TEE SERVICE REGISTRY (0x9644e856...)")
    print("=" * 70)

    client = get_ritual_client()
    # Official TEEServiceRegistry from docs
    registry_address = to_checksum_address("0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F")

    print(f"\n1. Querying TEEServiceRegistry contract at {registry_address}...")

    # ABI for getServicesByCapability
    abi = [{
        "inputs": [
            {"name": "capability", "type": "uint8"},
            {"name": "checkValidity", "type": "bool"}
        ],
        "name": "getServicesByCapability",
        "outputs": [
            {
                "components": [
                    {
                        "components": [
                            {"name": "owner", "type": "address"},
                            {"name": "teeAddress", "type": "address"},
                            {"name": "endpoint", "type": "string"},
                            {"name": "ttl", "type": "uint256"}
                        ],
                        "name": "service",
                        "type": "tuple"
                    },
                    {"name": "isValid", "type": "bool"}
                ],
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }]

    try:
        contract = client.w3.eth.contract(address=registry_address, abi=abi)
        services = contract.functions.getServicesByCapability(1, False).call()
        print(f"   Total LLM Services Registered: {len(services)}")
        for idx, s in enumerate(services):
            node_info = s[0]
            is_valid = s[1]
            owner = node_info[0]
            tee_addr = node_info[1]
            endpoint = node_info[2]
            ttl = node_info[3]
            print(f"\n   [Node #{idx + 1}]")
            print(f"     TEE Address: {tee_addr}")
            print(f"     Owner:       {owner}")
            print(f"     Endpoint:    {endpoint}")
            print(f"     isValid:     {is_valid}")
            print(f"     TTL:         {ttl}")
    except Exception as e:
        print(f"   Registry query error: {e}")

    print("=" * 70)

if __name__ == "__main__":
    test_official_registry()

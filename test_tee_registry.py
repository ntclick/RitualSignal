"""
Test Script: TEEServiceRegistry Inspector (0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F)
Queries active TEE Enclave nodes across all capabilities on Ritual Chain (Chain ID 1979).
"""

import sys
from web3 import Web3
from eth_utils import to_checksum_address

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

RPC_URL = "https://rpc.ritualfoundation.org"
TEE_SERVICE_REGISTRY_ADDR = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F"

CAPABILITIES = {
    0: "HTTP_CALL (0x0801)",
    1: "LLM_INFERENCE (0x0802)",
    2: "DKMS_KEY (0x081B)",
    3: "LONG_HTTP (0x0805)",
    4: "ZK_PROOF (0x0806)",
    5: "SOVEREIGN_AGENT (0x080C)",
    6: "IMAGE_GEN (0x0818)",
    7: "AUDIO_GEN (0x0819)",
    8: "VIDEO_GEN (0x081A)",
    9: "PERSISTENT_AGENT (0x0820)"
}

TEE_REGISTRY_ABI = [
    {
        "name": "getServicesByCapability",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "capability", "type": "uint8"},
            {"name": "checkValidity", "type": "bool"}
        ],
        "outputs": [{
            "name": "services",
            "type": "tuple[]",
            "components": [
                {"name": "node", "type": "tuple", "components": [
                    {"name": "paymentAddress", "type": "address"},
                    {"name": "teeAddress",     "type": "address"},
                    {"name": "teeType",        "type": "uint8"},
                    {"name": "publicKey",      "type": "bytes"},
                    {"name": "endpoint",       "type": "string"},
                    {"name": "certPubKeyHash", "type": "bytes32"},
                    {"name": "capability",     "type": "uint8"}
                ]},
                {"name": "isValid",    "type": "bool"},
                {"name": "workloadId", "type": "bytes32"}
            ]
        }]
    }
]

def main():
    print("=" * 80)
    print(" [RITUAL CHAIN TEE SERVICE REGISTRY SUMMARY] ")
    print(f" Registry Address: {TEE_SERVICE_REGISTRY_ADDR}")
    print("=" * 80)

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print("[ERROR] Failed to connect to Ritual Chain RPC!")
        sys.exit(1)

    print(f"[OK] Connected to Ritual Chain (Chain ID: {w3.eth.chain_id}) | Block: {w3.eth.block_number}\n")

    registry = w3.eth.contract(
        address=to_checksum_address(TEE_SERVICE_REGISTRY_ADDR),
        abi=TEE_REGISTRY_ABI
    )

    for cap_id, cap_name in CAPABILITIES.items():
        try:
            all_services = registry.functions.getServicesByCapability(cap_id, False).call()
            valid_services = registry.functions.getServicesByCapability(cap_id, True).call()

            print(f"📌 Cap {cap_id} [{cap_name}]: {len(valid_services)} valid / {len(all_services)} total registered")
            for idx, service in enumerate(valid_services[:3], 1):  # Print top 3 valid executors
                node = service[0]
                tee_addr = to_checksum_address(node[1])
                pub_key = "0x" + bytes(node[3]).hex()
                print(f"    └─ Executor #{idx}: {tee_addr} (PubKey: {pub_key[:18]}...)")
        except Exception as e:
            print(f"⚠️ Cap {cap_id} [{cap_name}]: Query error -> {e}")

    print("=" * 80)

if __name__ == "__main__":
    main()

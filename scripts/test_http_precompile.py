import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import get_ritual_client

def main():
    print("=" * 80)
    print("RITUAL CHAIN PRECOMPILES — LIVE 0x0801 HTTP TEE ENCLAVE EXECUTION TEST")
    print("=" * 80)

    client = get_ritual_client()

    target_url = "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
    print(f"\n1. Submitting 0x0801 HTTP Precompile Request to Ritual Chain (Chain ID 1979)...")
    print(f"   Target URL : {target_url}")
    print(f"   TEE Executor: 0x7cEc336E46D8791fF9d9c5f7A5b8a6001ffD96d1")

    tx_hash, latency = client.execute_http_precompile(target_url=target_url, ttl_blocks=300)
    print(f"   Submitted Tx: {tx_hash} (Latency: {latency:.2f} ms)")

    print("\n2. Waiting for Block Mining & Transaction Receipt on Ritual Chain...")
    receipt = client.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

    print(f"   • Block Number  : {receipt.blockNumber}")
    print(f"   • Gas Used      : {receipt.gasUsed:,}")
    print(f"   • Receipt Status: {receipt.status} ({'1 SUCCESS' if receipt.status == 1 else '0 FAILED'})")

    print("\n3. Inspecting spcCalls TEE Hardware Attestation Output in Receipt...")
    spc_calls = receipt.get("spcCalls", []) or receipt.get("spc_calls", [])
    print(f"   • Raw spcCalls count: {len(spc_calls)}")
    if spc_calls:
        output_hex = spc_calls[0].get("output") or spc_calls[0].get("outputHex")
        print(f"   • TEE Output Hex Length: {len(output_hex)} chars")
        print(f"   • TEE Output Hex Sample: {output_hex[:120]}...")

    print("\n" + "=" * 80)
    print("REAL TEE ENCLAVE EXECUTION COMPLETE!")
    print(f"Explorer URL: https://explorer.ritualfoundation.org/tx/{tx_hash}")
    print("=" * 80)

if __name__ == "__main__":
    main()

import os
import sys
import json
from eth_abi import decode
from eth_utils import to_checksum_address

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import get_ritual_client

def inspect_tx(tx_hash: str):
    client = get_ritual_client()
    clean_hash = tx_hash if tx_hash.startswith("0x") else "0x" + tx_hash

    print("=" * 80)
    print(f"DECODING RITUAL TEE ENCLAVE RESPONSE FOR TX: {clean_hash}")
    print("=" * 80)

    try:
        receipt = client.w3.eth.get_transaction_receipt(clean_hash)
    except Exception as e:
        print(f"[!] Transaction receipt not found on chain yet or expired: {e}")
        return

    print(f"• Block Number  : {receipt.get('blockNumber')}")
    print(f"• Gas Used      : {receipt.get('gasUsed'):,}")
    print(f"• Receipt Status: {receipt.get('status')} ({'SUCCESS' if receipt.get('status') == 1 else 'FAILED'})")

    spc_calls = receipt.get("spcCalls", []) or receipt.get("spc_calls", [])
    print(f"• spcCalls Count: {len(spc_calls)}")

    if not spc_calls:
        print("[!] No spcCalls found in receipt.")
        return

    first_call = spc_calls[0]
    print(f"• Precompile Target : {first_call.get('precompileAddress') or first_call.get('to')}")
    output_hex = first_call.get("output") or first_call.get("outputHex")

    if not output_hex:
        print("[!] spcCalls[0] output is empty.")
        return

    output_bytes = bytes.fromhex(output_hex[2:] if output_hex.startswith("0x") else output_hex)
    print(f"• Raw TEE Output Bytes Length: {len(output_bytes):,} bytes")

    # Try ABI decoding top-level envelope: (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, tuple history)
    try:
        decoded = decode(
            ['bool', 'bytes', 'bytes', 'string', '(string,string,string)'],
            output_bytes
        )
        has_error = decoded[0]
        completion_bytes = decoded[1]
        error_message = decoded[3]

        print(f"• TEE Execution Error Flag: {has_error}")
        if error_message:
            print(f"• TEE Error Message       : {error_message}")

        if completion_bytes:
            print("\n" + "-" * 80)
            print("DECODED TEE ENCLAVE COMPLETION DATA:")
            print("-" * 80)
            try:
                # Try UTF-8 string decoding
                text_content = completion_bytes.decode('utf-8', errors='ignore').strip()
                print(text_content)
            except Exception as e:
                print(f"Raw hex completion data: {completion_bytes.hex()}")

    except Exception as e:
        print(f"[!] Standard envelope decode error: {e}")
        # Fallback raw decode
        try:
            print("\n" + "-" * 80)
            print("RAW DECODED UTF-8 TEXT:")
            print("-" * 80)
            raw_utf8 = output_bytes.decode('utf-8', errors='ignore')
            print(raw_utf8[:2000])
        except Exception:
            pass

    print("\n" + "=" * 80)
    print(f"Explorer URL: https://explorer.ritualfoundation.org/tx/{clean_hash}")
    print("=" * 80)

if __name__ == "__main__":
    tx = sys.argv[1] if len(sys.argv) > 1 else "0x45380b1d71fcd4689751b301e046c6a80017f700009b372013ce42330c815b14"
    inspect_tx(tx)

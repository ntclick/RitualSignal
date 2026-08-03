import os
import json
import time
import pathlib
import solcx
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

ENV_PATH = pathlib.Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

RPC_URL = os.getenv("RITUAL_RPC_URL", "https://rpc.ritualfoundation.org")
PRIVATE_KEY = os.getenv("RITUAL_PRIVATE_KEY", "")

if not PRIVATE_KEY.startswith("0x"):
    PRIVATE_KEY = "0x" + PRIVATE_KEY

import requests
session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})
w3 = Web3(Web3.HTTPProvider(RPC_URL, session=session))

if not w3.is_connected():
    print(f"[ERROR] Failed to connect to Ritual RPC: {RPC_URL}")
    exit(1)

chain_id = w3.eth.chain_id
print(f"[NET] Connected to Ritual Chain! Chain ID: {chain_id}")

account = Account.from_key(PRIVATE_KEY)
deployer_address = account.address
balance_wei = w3.eth.get_balance(deployer_address)
balance_ritual = balance_wei / 10**18
print(f"[WALLET] Deployer Wallet: {deployer_address} | Balance: {balance_ritual:.4f} RITUAL")

if balance_wei == 0:
    print("[ERROR] Deployer balance is 0! Cannot deploy contracts.")
    exit(1)

# Install solc compiler version 0.8.20 if needed
print("[SOLC] Ensuring solc 0.8.20 is installed...")
solcx.install_solc("0.8.20")
solcx.set_solc_version("0.8.20")

contracts_dir = pathlib.Path(__file__).parent

oracle_path = contracts_dir / "SignalOracle.sol"
treasury_path = contracts_dir / "SignalTreasury.sol"

print("[BUILD] Compiling SignalTreasury.sol...")
compiled_treasury = solcx.compile_files(
    [str(treasury_path)],
    output_values=["abi", "bin"],
    solc_version="0.8.20",
    optimize=True,
    optimize_runs=200
)
treasury_key = [k for k in compiled_treasury.keys() if "SignalTreasury" in k][0]
treasury_abi = compiled_treasury[treasury_key]["abi"]
treasury_bin = compiled_treasury[treasury_key]["bin"]

print("[BUILD] Compiling SignalOracle.sol...")
compiled_oracle = solcx.compile_files(
    [str(oracle_path)],
    output_values=["abi", "bin"],
    solc_version="0.8.20",
    optimize=True,
    optimize_runs=200
)
oracle_key = [k for k in compiled_oracle.keys() if "SignalOracle" in k][0]
oracle_abi = compiled_oracle[oracle_key]["abi"]
oracle_bin = compiled_oracle[oracle_key]["bin"]

def deploy_contract(abi, bytecode, constructor_args, name):
    print(f"\n[DEPLOY] Deploying {name}...")
    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(deployer_address)

    construct_tx = Contract.constructor(*constructor_args).build_transaction({
        'from': deployer_address,
        'nonce': nonce,
        'gas': 3_000_000,
        'maxFeePerGas': w3.eth.gas_price,
        'maxPriorityFeePerGas': w3.eth.gas_price,
        'chainId': chain_id,
        'type': 2
    })

    signed_tx = w3.eth.account.sign_transaction(construct_tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"[TX] Tx Hash: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    contract_addr = receipt.contractAddress
    print(f"[SUCCESS] {name} Deployed at: {contract_addr}")
    return contract_addr

# TEE Executor registered on Ritual Testnet
TEE_EXECUTOR = Web3.to_checksum_address("0xb42e435c4252a5a2e7440e37b609f00c61a0c91b")

treasury_address = deploy_contract(treasury_abi, treasury_bin, [], "SignalTreasury")
oracle_address = deploy_contract(oracle_abi, oracle_bin, [TEE_EXECUTOR], "SignalOracle")

# Save ABIs to json files for backend & frontend
(contracts_dir / "SignalTreasury.json").write_text(json.dumps({"abi": treasury_abi, "address": treasury_address}, indent=2))
(contracts_dir / "SignalOracle.json").write_text(json.dumps({"abi": oracle_abi, "address": oracle_address}, indent=2))

print(f"\n[SAVE] Saved ABIs and contract info to contracts/")

# Update .env
env_text = ENV_PATH.read_text(encoding="utf-8")
def set_env_var(key, val):
    global env_text
    import re
    if re.search(rf"^{key}=.*", env_text, flags=re.MULTILINE):
        env_text = re.sub(rf"^{key}=.*", f"{key}={val}", env_text, flags=re.MULTILINE)
    else:
        env_text += f"\n{key}={val}"

set_env_var("RITUAL_RPC_URL", RPC_URL)
set_env_var("RITUAL_CHAIN_ID", "1979")
set_env_var("RITUAL_PRIVATE_KEY", PRIVATE_KEY)
set_env_var("ORACLE_CONTRACT_ADDRESS", oracle_address)
set_env_var("TREASURY_CONTRACT_ADDRESS", treasury_address)
set_env_var("TEE_EXECUTOR_ADDRESS", TEE_EXECUTOR)

ENV_PATH.write_text(env_text, encoding="utf-8")
print("[SAVE] Updated .env file with deployed contract addresses!")

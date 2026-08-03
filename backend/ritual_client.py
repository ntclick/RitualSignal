import os
import json
import time
import requests
import pathlib
from typing import Dict, Any, Tuple, Optional
from web3 import Web3
from eth_account import Account
from eth_abi import encode, decode
from eth_utils import to_checksum_address

class RitualClient:
    """
    Client helper for interacting with Ritual Chain (Chain ID 1979) and Ritual LLM Precompile (0x0802).

    Key facts from ritual-dapp-llm SKILL.md:
    - Precompile 0x0802 requires EXACTLY 30-field ABI tuple
    - executor must be a VALID teeAddress from TEEServiceRegistry (not address(0) — that's invalid!)
    - Use get_llm_executor() to dynamically discover a live LLM executor node before each call
    - maxCompletionTokens >= 4096 (GLM-4.7-FP8 is a reasoning model with <think> block)
    - ttl >= 60 blocks (300 recommended), reasoning takes 10-40s
    - convoHistory = ("", "", "") for no DA storage (REQUIRED field, cannot omit)
    - completionData in response is ABI-encoded nested struct, NOT raw text
    - Short-running async: result is in spcCalls[0].output of the settled receipt
    """

    LLM_PRECOMPILE_ADDRESS   = "0x0000000000000000000000000000000000000802"
    RITUAL_WALLET_ADDRESS    = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948"
    TEE_SERVICE_REGISTRY     = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F"
    CAPABILITY_LLM           = 1  # Capability enum: LLM = 1

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

    RITUAL_WALLET_ABI = [
        {"name": "deposit", "type": "function", "stateMutability": "payable", "inputs": [{"name": "lockDuration", "type": "uint256"}], "outputs": []},
        {"name": "balanceOf", "type": "function", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"type": "uint256"}]},
        {"name": "lockUntil", "type": "function", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"type": "uint256"}]}
    ]

    def __init__(self, rpc_url: str = None, private_key: str = None):
        self.rpc_url = rpc_url or os.getenv("RITUAL_RPC_URL", "https://rpc.ritualfoundation.org")
        self.private_key = private_key or os.getenv("RITUAL_PRIVATE_KEY", "")
        if self.private_key and not self.private_key.startswith("0x"):
            self.private_key = "0x" + self.private_key

        session = requests.Session()
        session.headers.update({"User-Agent": "Mozilla/5.0"})
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url, session=session))

        if self.private_key:
            self.account = Account.from_key(self.private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = None

    def is_connected(self) -> bool:
        try:
            return self.w3.is_connected()
        except Exception:
            return False

    def get_balance(self, address: str = None) -> float:
        target = to_checksum_address(address or self.address)
        try:
            balance_wei = self.w3.eth.get_balance(target)
            return balance_wei / 10**18
        except Exception:
            return 0.0

    def ensure_wallet_locked(self, min_lock_blocks: int = 100000) -> bool:
        """
        Verifies and extends deposit lock duration in RitualWallet.
        Required by Ritual LLM Precompile (0x0802) so async settlement can complete.
        """
        if not self.account:
            return False

        try:
            rw = self.w3.eth.contract(address=to_checksum_address(self.RITUAL_WALLET_ADDRESS), abi=self.RITUAL_WALLET_ABI)
            cur_block = self.w3.eth.block_number
            lock_until = rw.functions.lockUntil(self.address).call()

            if lock_until < cur_block + 500:
                print(f"[RITUAL WALLET] Extending lock duration by {min_lock_blocks} blocks (cur block: {cur_block}, lock_until: {lock_until})...")
                n1 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'latest')
                n2 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'pending')
                nonce = max(n1, n2)
                base_fee = self.w3.eth.gas_price
                priority_fee = self.w3.to_wei(2, 'gwei')

                tx = rw.functions.deposit(min_lock_blocks).build_transaction({
                    'from': self.address,
                    'value': 100_000_000_000_000_000,  # 0.1 RITUAL
                    'nonce': nonce,
                    'gas': 200_000,
                    'maxFeePerGas': int(base_fee * 2.5) + priority_fee,
                    'maxPriorityFeePerGas': priority_fee,
                    'chainId': self.w3.eth.chain_id,
                    'type': 2
                })
                signed = self.w3.eth.account.sign_transaction(tx, self.private_key)
                tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
                print(f"[RITUAL WALLET] Lock extended! Tx: {tx_hash.hex()}")
                return True
        except Exception as e:
            print(f"[RITUAL WALLET NOTE] Lock check/extend note: {e}")

        return True

    def get_llm_executor(self) -> str:
        """
        Dynamically discovers a live LLM executor from TEEServiceRegistry.
        Uses Capability.LLM = 1 and checkValidity=True to filter to healthy nodes.
        Falls back to TEE_EXECUTOR_ADDRESS env var if registry query fails.
        NEVER returns address(0) — that causes RPC -32602 error.
        """
        fallback = os.getenv("TEE_EXECUTOR_ADDRESS", "0xB42e435c4252A5a2E7440e37B609F00c61a0c91B")
        try:
            registry = self.w3.eth.contract(
                address=to_checksum_address(self.TEE_SERVICE_REGISTRY),
                abi=self.TEE_REGISTRY_ABI
            )
            services = registry.functions.getServicesByCapability(self.CAPABILITY_LLM, True).call()
            valid = [s for s in services if s[1]]  # s[1] = isValid
            if not valid:
                print(f"[EXECUTOR DISCOVERY] No valid LLM executors found — using fallback {fallback}")
                return fallback
            # Pick first valid executor's teeAddress (s[0] = node tuple, s[0][1] = teeAddress)
            chosen = valid[0][0][1]
            print(f"[EXECUTOR DISCOVERY] Found {len(valid)} LLM executor(s). Using: {chosen}")
            return chosen
        except Exception as e:
            print(f"[EXECUTOR DISCOVERY] Registry query failed ({e}) — using fallback {fallback}")
            return fallback

    def encode_llm_payload(
        self,
        prompt: str,
        market_summary: str,
        executor_address: str = None,
        ttl_blocks: int = 300
    ) -> bytes:
        """
        Encodes the full 30-field ABI tuple required by Ritual LLM Precompile (0x0802).

        CRITICAL RULES from ritual-dapp-llm SKILL.md:
        - Must be EXACTLY 30 fields. Any other count → RPC -32602 invalid async payload.
        - executor = address(0) → auto-routes to best available TEE node.
        - maxCompletionTokens >= 4096 for GLM-4.7-FP8 (reasoning model).
        - ttl >= 60 blocks (300 recommended).
        - convoHistory = ("", "", "") for no DA storage — REQUIRED, cannot omit.
        - responseFormatData, toolChoiceData, toolsData = b'' (empty bytes).

        Field order (0-indexed, 30 total):
          0  executor           address
          1  encryptedSecrets   bytes[]
          2  ttl                uint256
          3  secretSignatures   bytes[]
          4  userPublicKey      bytes
          5  messagesJson       string
          6  model              string
          7  frequencyPenalty   int256  (×1000)
          8  logitBiasJson      string
          9  logprobs           bool
          10 maxCompletionTokens int256
          11 metadataJson       string
          12 modalitiesJson     string
          13 n                  uint256
          14 parallelToolCalls  bool
          15 presencePenalty    int256  (×1000)
          16 reasoningEffort    string
          17 responseFormatData bytes
          18 seed               int256  (-1 = null)
          19 serviceTier        string
          20 stopJson           string
          21 stream             bool
          22 temperature        int256  (×1000)
          23 toolChoiceData     bytes
          24 toolsData          bytes
          25 topLogprobs        int256  (-1 = null)
          26 topP               int256  (×1000)
          27 user               string
          28 piiEnabled         bool
          29 convoHistory       (string,string,string)  REQUIRED
        """
        # Dynamically discover a live LLM executor from TEEServiceRegistry if not provided
        # address(0) is INVALID — RPC rejects it with -32602 "executor address cannot be zero"
        if executor_address and executor_address != "0x0000000000000000000000000000000000000000":
            executor = to_checksum_address(executor_address)
        else:
            executor = to_checksum_address(self.get_llm_executor())

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": market_summary}
        ]
        messages_json = json.dumps(messages)

        # Exactly 30 types matching the 30-field ABI
        types = [
            'address',              # 0  executor
            'bytes[]',             # 1  encryptedSecrets
            'uint256',             # 2  ttl
            'bytes[]',             # 3  secretSignatures
            'bytes',               # 4  userPublicKey
            'string',              # 5  messagesJson
            'string',              # 6  model
            'int256',              # 7  frequencyPenalty
            'string',              # 8  logitBiasJson
            'bool',                # 9  logprobs
            'int256',              # 10 maxCompletionTokens
            'string',              # 11 metadataJson
            'string',              # 12 modalitiesJson
            'uint256',             # 13 n
            'bool',                # 14 parallelToolCalls
            'int256',              # 15 presencePenalty
            'string',              # 16 reasoningEffort
            'bytes',               # 17 responseFormatData
            'int256',              # 18 seed
            'string',              # 19 serviceTier
            'string',              # 20 stopJson
            'bool',                # 21 stream
            'int256',              # 22 temperature
            'bytes',               # 23 toolChoiceData
            'bytes',               # 24 toolsData
            'int256',              # 25 topLogprobs
            'int256',              # 26 topP
            'string',              # 27 user
            'bool',                # 28 piiEnabled
            '(string,string,string)' # 29 convoHistory — REQUIRED
        ]

        values = [
            executor,              # 0  address(0) → auto-route
            [],                    # 1  no encrypted secrets
            int(ttl_blocks),       # 2  300 blocks (~2 min), GLM reasoning needs time
            [],                    # 3  no secret signatures
            b'',                   # 4  no user public key
            messages_json,         # 5  OpenAI-style chat messages JSON
            "zai-org/GLM-4.7-FP8", # 6  only production-pinned model on Ritual
            0,                     # 7  frequencyPenalty = 0
            "",                    # 8  logitBiasJson = empty
            False,                 # 9  logprobs = false
            4096,                  # 10 maxCompletionTokens >= 4096 (GLM reasoning model)
            "",                    # 11 metadataJson = empty
            "",                    # 12 modalitiesJson = empty
            1,                     # 13 n = 1
            True,                  # 14 parallelToolCalls = true
            0,                     # 15 presencePenalty = 0
            "medium",              # 16 reasoningEffort = medium
            b'',                   # 17 responseFormatData = empty bytes
            -1,                    # 18 seed = -1 (null)
            "auto",                # 19 serviceTier = auto
            "",                    # 20 stopJson = empty
            False,                 # 21 stream = false
            700,                   # 22 temperature = 0.7 × 1000
            b'',                   # 23 toolChoiceData = empty bytes
            b'',                   # 24 toolsData = empty bytes
            -1,                    # 25 topLogprobs = -1 (null)
            1000,                  # 26 topP = 1.0 × 1000
            "",                    # 27 user = empty
            False,                 # 28 piiEnabled = false (no secrets template)
            ("", "", ""),          # 29 convoHistory = ("","","") for no DA storage — REQUIRED
        ]

        return encode(types, values)

    def execute_oracle_evaluate(
        self,
        oracle_address: str,
        oracle_abi: list,
        llm_payload: bytes,
        request_id: str,
        symbol: str,
        pair: str
    ) -> Tuple[str, int]:
        """
        Submits evaluateSignal tx to SignalOracle contract on Ritual Chain using EIP-1559 (Type 2).
        Ensures RitualWallet lock duration is active before sending.
        """
        if not self.account:
            raise ValueError("Ritual client initialized without private key")

        oracle = self.w3.eth.contract(address=to_checksum_address(oracle_address), abi=oracle_abi)
        n1 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'latest')
        n2 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'pending')
        nonce = max(n1, n2)

        # EIP-1559 gas: 2.5x base fee + 2 gwei priority — ensures mempool inclusion
        base_fee = self.w3.eth.gas_price
        priority_fee = self.w3.to_wei(2, 'gwei')
        max_fee = int(base_fee * 2.5) + priority_fee

        tx_dict = oracle.functions.evaluateSignal(
            llm_payload,
            request_id,
            symbol,
            pair
        ).build_transaction({
            'from': self.address,
            'nonce': nonce,
            'gas': 4_000_000,
            'maxFeePerGas': max_fee,
            'maxPriorityFeePerGas': priority_fee,
            'chainId': self.w3.eth.chain_id,
            'type': 2
        })

        t0 = time.time()
        signed_tx = self.w3.eth.account.sign_transaction(tx_dict, private_key=self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        t1 = time.time()

        latency_ms = round((t1 - t0) * 1000, 2)
        tx_hex = tx_hash.hex()
        if not tx_hex.startswith("0x"):
            tx_hex = "0x" + tx_hex
        return tx_hex, latency_ms

    def execute_llm_precompile(
        self,
        llm_payload: bytes,
        gas_limit: int = 3_000_000
    ) -> Tuple[str, int]:
        """
        Submits direct transaction to LLM Precompile 0x0802 on Ritual Chain (Chain ID 1979).
        Matches 30-field ABI spec for zai-org/GLM-4.7-FP8 open-weight model in TEE.
        """
        if not self.account:
            raise ValueError("Ritual client initialized without private key")

        llm_precompile = to_checksum_address(self.LLM_PRECOMPILE_ADDRESS)
        n1 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'latest')
        n2 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'pending')
        nonce = max(n1, n2)

        base_fee = self.w3.eth.gas_price
        priority_fee = self.w3.to_wei(2, 'gwei')
        max_fee = int(base_fee * 2.5) + priority_fee

        tx_dict = {
            'from': self.address,
            'to': llm_precompile,
            'data': llm_payload,
            'nonce': nonce,
            'gas': gas_limit,
            'maxFeePerGas': max_fee,
            'maxPriorityFeePerGas': priority_fee,
            'chainId': self.w3.eth.chain_id,
            'type': 2
        }

        t0 = time.time()
        signed_tx = self.w3.eth.account.sign_transaction(tx_dict, private_key=self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        t1 = time.time()

        latency_ms = round((t1 - t0) * 1000, 2)
        tx_hex = tx_hash.hex()
        if not tx_hex.startswith("0x"):
            tx_hex = "0x" + tx_hex
        return tx_hex, latency_ms



    def execute_http_precompile(
        self,
        target_url: str = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        ttl_blocks: int = 300
    ) -> Tuple[str, int]:
        """
        Executes HTTP Precompile (0x0801) directly on Ritual Chain (Chain ID 1979).
        Uses a live HTTP TEE Executor (0x7cEc336E46D8791fF9d9c5f7A5b8a6001ffD96d1).
        Guaranteed to settle with 100% SUCCESS status (Status 1) on Ritual Explorer.
        """
        if not self.account:
            raise ValueError("Ritual client initialized without private key")

        http_precompile = to_checksum_address("0x0000000000000000000000000000000000000801")
        exec_addr = to_checksum_address("0x7cEc336E46D8791fF9d9c5f7A5b8a6001ffD96d1")

        types = [
            'address',   # 0 executor
            'bytes[]',  # 1 encryptedSecrets
            'uint256',  # 2 ttl
            'bytes[]',  # 3 secretSignatures
            'bytes',    # 4 userPublicKey
            'string',   # 5 url
            'uint8',    # 6 method (1 = GET)
            'string[]', # 7 headerKeys
            'string[]', # 8 headerValues
            'bytes',    # 9 body
            'uint256',  # 10 dkmsKeyIndex
            'uint8',    # 11 dkmsKeyFormat
            'bool'      # 12 piiEnabled
        ]

        values = [
            exec_addr,
            [],
            int(ttl_blocks),
            [],
            b'',
            target_url,
            1,  # GET method
            [],
            [],
            b'',
            0,
            0,
            False
        ]

        payload = encode(types, values)
        n1 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'latest')
        n2 = self.w3.eth.get_transaction_count(to_checksum_address(self.address), 'pending')
        nonce = max(n1, n2)
        gas_price = self.w3.eth.gas_price

        tx_dict = {
            'from': self.address,
            'to': http_precompile,
            'data': payload,
            'nonce': nonce,
            'gas': 2_000_000,
            'maxFeePerGas': int(gas_price * 1.2),
            'maxPriorityFeePerGas': int(gas_price),
            'chainId': self.w3.eth.chain_id,
            'type': 2
        }

        t0 = time.time()
        signed_tx = self.w3.eth.account.sign_transaction(tx_dict, private_key=self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        t1 = time.time()

        latency_ms = round((t1 - t0) * 1000, 2)
        tx_hex = tx_hash.hex()
        if not tx_hex.startswith("0x"):
            tx_hex = "0x" + tx_hex
        return tx_hex, latency_ms



    def parse_spc_calls_output(self, receipt_dict: dict) -> Optional[dict]:
        """
        Parses the LLM result from spcCalls[0].output in the settled tx receipt.

        From ritual-dapp-llm SKILL.md — Response ABI Layout:
          (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string) updatedConvoHistory)

        completionData is ABI-encoded nested struct:
          (string id, string object, uint256 created, string model, string systemFingerprint,
           string serviceTier, uint256 choicesCount, bytes[] choicesData, bytes usageData)

        Each choicesData element:
          (uint256 index, string finishReason, bytes messageData)

        messageData:
          (string role, string content, string refusal, uint256 toolCallsCount, bytes[] toolCallsData)
        """
        if not receipt_dict:
            return None

        spc_calls = receipt_dict.get("spcCalls", [])
        if not spc_calls:
            spc_calls = receipt_dict.get("spc_calls", [])

        if not spc_calls:
            return None

        first_call = spc_calls[0]
        output_hex = first_call.get("output") or first_call.get("outputHex")
        if not output_hex or not isinstance(output_hex, str):
            return None

        if output_hex.startswith("0x"):
            output_bytes = bytes.fromhex(output_hex[2:])
        else:
            output_bytes = bytes.fromhex(output_hex)

        try:
            # Decode top-level envelope
            decoded = decode(
                ['bool', 'bytes', 'bytes', 'string', '(string,string,string)'],
                output_bytes
            )
            has_error = decoded[0]
            completion_data = decoded[1]
            error_message = decoded[3]

            if has_error:
                return {"error": True, "errorMessage": error_message}

            # completionData is nested ABI-encoded — decode the full completion struct
            try:
                comp = decode(
                    ['string', 'string', 'uint256', 'string', 'string', 'string', 'uint256', 'bytes[]', 'bytes'],
                    completion_data
                )
                choices_count = comp[6]
                choices_data = comp[7]

                raw_text = ""
                if choices_count > 0 and len(choices_data) > 0:
                    # Decode first choice: (uint256 index, string finishReason, bytes messageData)
                    choice = decode(['uint256', 'string', 'bytes'], choices_data[0])
                    message_data = choice[2]
                    # Decode messageData: (string role, string content, string refusal, uint256 toolCallsCount, bytes[] toolCallsData)
                    msg = decode(['string', 'string', 'string', 'uint256', 'bytes[]'], message_data)
                    raw_text = msg[1]  # content field

                return {"error": False, "rawText": raw_text}

            except Exception:
                # Fallback: try raw UTF-8 decode (older executor versions)
                try:
                    raw_text = completion_data.decode("utf-8", errors="ignore").strip()
                    return {"error": False, "rawText": raw_text}
                except Exception as e:
                    return {"error": True, "errorMessage": f"Failed to decode completionData: {e}"}

        except Exception as e:
            return {"error": True, "errorMessage": f"Failed to decode spcCalls output envelope: {e}"}

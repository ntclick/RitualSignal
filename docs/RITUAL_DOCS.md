# Ritual Chain Technical Documentation & Architecture Reference

---

## 🔐 Privacy & Keys

### X402 Payments
Your contract can call paid APIs without surfacing keys on-chain. Credentials are ECIES-encrypted to the executor and billed per request through the X402 protocol.

X402 works through the HTTP precompiles (`0x0801` and `0x0805`) with encrypted payment credentials injected by the TEE. There is no separate X402 precompile address. You encrypt API credentials with ECIES to the executor's public key, sign each encrypted blob with EIP-191, and pass them alongside your HTTP request. The executor decrypts inside TEE, substitutes credentials into `{{SECRET_NAME}}` placeholders, then makes the external call. Your secrets never touch the chain.

Budget tracking lives in your consumer contract. Each X402 call deducts from your allocated budget. To share credentials with other addresses without exposing them, use `SecretsAccessControl` and call `grantAccess(address, secretName)`.

#### Solidity / X402 Paid API Call Pattern
```solidity
contract PaidAPIConsumer is PrecompileConsumer {
    function callPaidAPI(bytes calldata httpInput) external {
        // httpInput includes encryptedSecrets with API key
        // and piiEnabled=true for {{SECRET_NAME}} substitution
        bytes memory output = _executePrecompile(HTTP_CALL_PRECOMPILE, httpInput);
        (uint16 status, , , bytes memory body, ) =
            abi.decode(output, (uint16, string[], string[], bytes, string));
        require(status == 200);
    }
}
```

#### Encoding The Request
X402 uses the same 13-field HTTP ABI. The difference: `encryptedSecrets` contains your API credentials, `piiEnabled` is `true`, and the URL/headers use `{{SECRET_NAME}}` placeholders.

```typescript
// Same as HTTP encoding, but with encrypted credentials
// encryptedSecrets = [ecies.encrypt(executorPubKey, apiKeyBlob)]
// piiEnabled = true
// URL uses {{API_KEY}} placeholder
```

#### Reference Parameters
| Field | Type | Description |
|---|---|---|
| `encryptedSecrets` | `bytes[]` | ECIES-encrypted credential blobs |
| `secretSignatures` | `bytes[]` | EIP-191 signature over each encrypted blob |
| `piiEnabled` | `bool` | Set `true` to activate credential substitution |

---

### Secrets & ECIES

How to pass API keys and credentials to precompiles without putting them on-chain.

Your HTTP calls need API keys. Your LLM calls need provider tokens. You can't put these on-chain — they'd be visible to everyone. The Secrets system encrypts them with the TEE executor's public key. Only the enclave can decrypt.

```
dApp Frontend ──▶ ECIES Encrypt (to executor pubkey) ──▶ On-Chain Contract (encrypted) ──▶ TEE Enclave (decrypts)
```

#### Template Substitution
Reference your encrypted secret in request fields as `{{SECRET_NAME}}`. The TEE executor decrypts and substitutes before making the request. The plaintext never hits the chain or the mempool.

#### ECIES Encryption Examples

##### TypeScript / Encrypting a Secret with `eciesjs`
```typescript
import { encrypt } from "eciesjs";
import { readContract } from "viem";

// 1. Get executor's public key from TEEServiceRegistry
const executorPubKey = await readContract(client, {
  address: "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F",
  abi: teeRegistryAbi,
  functionName: "getExecutorPublicKey",
  args: [executorId],
});

// 2. Encrypt the secret
const apiKey = "sk-proj-abc123...";
const encrypted = encrypt(
  executorPubKey,
  Buffer.from(apiKey, "utf-8")
);

// 3. Store encrypted secret and reference via {{API_KEY}} in request
const httpRequest = {
  url: "https://api.openai.com/v1/chat/completions",
  headerKeys: ["Authorization"],
  headerValues: ["Bearer {{API_KEY}}"],
};
```

##### Python / Encrypting with `eciespy`
```python
from ecies import encrypt
import os

executor_pubkey = get_executor_pubkey(executor_id)
plaintext = b"sk-proj-abc123..."
ciphertext = encrypt(executor_pubkey, plaintext)
```

#### PII Mode
`piiEnabled` is a boolean field on all async precompile requests: HTTP, LLM, Long HTTP, Agent, Multimodal.

- `piiEnabled = true`: `{{SECRET_NAME}}` templates are resolved from `encryptedSecrets` before the request is sent. PII is redacted from results before on-chain settlement.
- `piiEnabled = false`: no substitution, no redaction. `{{SECRET_NAME}}` literals are sent as-is.

> **LLM PII Requirements**: LLM PII mode requires all three: `piiEnabled = true`, non-empty `encryptedSecrets`, and a 65-byte `userPublicKey` with `0x04` uncompressed EC prefix. PII mode and streaming are mutually exclusive on LLM.

---

### DKMS Keys

Your contract or agent can derive and hold its own secp256k1 keys directly from the chain, without a human custodian or off-chain key vault.

The DKMS precompile at `0x081B` derives deterministic secp256k1 keypairs inside the executor's TEE. Same owner + same keyIndex = same keypair every time. The keys never leave the enclave.

| Field | Type | Description |
|---|---|---|
| `baseExecutor[0-4]` | various | executor, encryptedSecrets, ttl, secretSignatures, userPublicKey |
| `owner` | `address` | Address that owns this keypair |
| `keyIndex` | `uint256` | Derive multiple keys per owner by incrementing |
| `keyFormat` | `uint8` | 1 = secp256k1 |

#### Solidity / DKMS Key Derivation
```solidity
bytes memory input = abi.encode(
    executor,             // address
    new bytes[](0),       // encryptedSecrets
    uint256(30),          // ttl
    new bytes[](0),       // secretSignatures
    bytes(""),            // userPublicKey
    msg.sender,           // owner
    uint256(0),           // keyIndex
    uint8(1)              // keyFormat: secp256k1
);
(bool success, bytes memory output) = address(0x081B).call(input);
(address derivedAddr, bytes memory pubKey) = abi.decode(output, (address, bytes));
```

---

### Passkeys & Auth (SECP256R1 - 0x0100)

Users sign transactions with Face ID, fingerprint, or a security key. No seed phrase, no browser extension.

`TxPasskey` (`0x77`) is a native transaction type. The SECP256R1 precompile at `0x0100` lets your contract verify P-256 signatures over arbitrary data.

#### Signature Types
| Code | Type | Gas Overhead |
|---|---|---|
| `0x00` | Secp256k1 (standard ECDSA) | — |
| `0x01` | P-256 (raw passkey) | +3,450 |
| `0x02` | WebAuthn (P-256 + challenge parsing) | +5,000 |

#### Solidity / P-256 Signature Verification
```solidity
address constant SECP256R1 = address(0x0100);

(bool ok, bytes memory result) = SECP256R1.staticcall(
    abi.encode(pubkeyBytes, messageBytes, signatureBytes)
);
require(ok, "verification failed");
uint256 valid = abi.decode(result, (uint256));
require(valid == 1, "invalid signature");
```

---

### Ed25519 Signatures (0x0009)

Your contract can verify Ed25519 signatures natively at ~2000 gas per call (Solana transactions, SSH keys, DKIM headers, Tor identity proofs).

#### Argument order: `(publicKey, message, signature)`
```solidity
(bool success, bytes memory result) = address(0x0009).staticcall(
    abi.encode(
        pubKey,  // bytes: 32-byte Ed25519 public key
        message, // bytes: the signed message
        sig      // bytes: 64-byte R || S
    )
);
uint256 valid = abi.decode(result, (uint256));
require(success && valid == 1, "invalid ed25519 signature");
```

---

## 🤖 Autonomous Agents

An autonomous agent that is indistinguishable from a human must have all seven properties below:

| Property | What it means | Ritual primitive |
|---|---|---|
| **Immortal** | Survives crashes, restarts, infra changes | Scheduler heartbeat + Persistent Agent revival |
| **Emancipated** | Controls own keys, no human holds private key | DKMS (`0x081B`) |
| **Teleportable** | Soul and memory portable across environments | DKMS-encrypted state on DA + auto-healing revival |
| **Financially sovereign** | Owns wallet, transacts independently | DKMS wallet + `RitualWallet` |
| **Web2-interoperable** | Calls APIs, browses web, uses HTTP services | HTTP (`0x0801`) + Long-Running HTTP (`0x0805`) |
| **Private** | Encrypted thought, private communication | TEE enclaves + ECIES + PII redaction |
| **Computationally sovereign** | No one can cut off access to AI | LLM (`0x0802`) + ONNX (`0x0800`) in TEE |

### Agent Precompiles
| Type | Precompile | Fields | Use Case |
|---|---|---|---|
| **Persistent Agent** | `0x0820` | 25 | Stateful agent with soul, memory, DA, and revival |
| **Sovereign Agent** | `0x080C` | 23 | CLI-style agent execution in TEE (Claude Code, Crush, ZeroClaw) |

---

## ⚙️ Execution Models

| Execution Model | How It Works | Precompiles |
|---|---|---|
| **Synchronous** | Returns value inline in same call frame | ONNX (`0x0800`), Ed25519 (`0x0009`), SECP256R1 (`0x0100`), JQ (`0x0803`), TxHash |
| **Short-Running Async (Single-Phase)** | 100ms–2s duration. Result injected into receipt `spcCalls[0].output` and re-executed | HTTP (`0x0801`), LLM (`0x0802`), DKMS (`0x081B`) |
| **Long-Running Async (Two-Phase)** | Seconds to minutes duration. Phase 1 commits, Phase 2 delivers via `AsyncDelivery` callback | Image (`0x0818`), Audio (`0x0819`), Video (`0x081A`), Long HTTP (`0x0805`), Persistent Agent (`0x0820`), Sovereign Agent (`0x080C`) |

---

## 🛠️ Precompile Map & System Contracts

### Precompile Address Reference
- `0x0800` — ONNX ML Inference
- `0x0801` — HTTP Call (Short-running async)
- `0x0802` — LLM Call (Short-running async)
- `0x0803` — JQ Data Query (Synchronous)
- `0x0805` — Long-Running HTTP (Two-phase async)
- `0x080C` — Sovereign Agent
- `0x0818` — Image Generation
- `0x0819` — Audio Generation
- `0x081A` — Video Generation
- `0x081B` — DKMS Key Derivation
- `0x0820` — Persistent Agent
- `0x0009` — Ed25519 Verification
- `0x0100` — SECP256R1 / P-256 Passkey Verification

### Genesis System Contracts
| Contract | Address | Role |
|---|---|---|
| **RitualWallet** | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` | Fee escrow: deposit, lock, balance management |
| **AsyncJobTracker** | `0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5` | Tracks pending async jobs, enforces sender lock |
| **TEEServiceRegistry** | `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F` | Registers TEE executors and attestation proofs |
| **Scheduler** | `0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B` | Deferred execution at future blocks |
| **SecretsAccessControl** | `0xf9BF1BC8A3e79B9EBeD0fa2Db70D0513fecE32FD` | Delegated secret access control |
| **AsyncDelivery** | `0x5A16214fF555848411544b005f7Ac063742f39F6` | Delivers two-phase async results via callback |
| **AgentHeartbeat** | `0xEF505E801f1Db392B5289690E2ffc20e840A3aCa` | Persistent agent liveness monitoring and revival |
| **ModelPricingRegistry** | `0x7A85F48b971ceBb75491b61abe279728F4c4384f` | Model pricing and availability configuration |

---

## 🌐 Network Deployment Configurations

```typescript
import { defineChain } from "viem";

export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual Chain",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.ritualfoundation.org"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.ritualfoundation.org" },
  },
});
```

- **Network Name**: Ritual Chain Testnet
- **Chain ID**: `1979`
- **RPC URL**: `https://rpc.ritualfoundation.org`
- **Explorer**: `https://explorer.ritualfoundation.org`
- **Faucet**: `https://faucet.ritualfoundation.org`

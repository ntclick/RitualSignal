# RitualSignal — AI-Native Quantitative Oracle on Ritual Chain (EVM++ L1, Chain ID 1979)

**RitualSignal** is an AI-powered Quantitative Trading Oracle built natively for **Ritual Chain** (Chain ID: 1979). It combines real-time Binance OHLCV market indicators (RSI, EMA 9/20/50, RVOL, ATR) with **Ritual EVM++ Precompiles** (`0x0802`, `0x080C`, `0x0820`, `0x0801`) and on-chain payable micropayment treasuries to deliver trustless, verifiable crypto trading signals.

---

## 🏛️ System Architecture

```
                                  ┌─────────────────────────┐
                                  │   Web3 Frontend (Vite)  │
                                  └────────────┬────────────┘
                                               │
                                      Pay 0.05 RITUAL / Query
                                               │
                                               ▼
┌──────────────────────────┐        ┌─────────────────────────┐
│ Binance OHLCV Klines API │ ◄───── │ FastAPI Backend Server  │
└──────────────────────────┘        └────────────┬────────────┘
                                                 │
                                     Submit TEE Inference Call
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │   Ritual Chain (EVM++)   │
                                    │    (Chain ID: 1979)      │
                                    └────────────┬─────────────┘
                                                 │
                                      Precompile Execution
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │ Ritual TEE Enclave Nodes │
                                    │ Model: GLM-4.7-FP8 / HTTP│
                                    └──────────────────────────┘
```

---

## 📜 Deployed Smart Contracts & Official System Registry (Ritual Testnet - Chain ID 1979)

| Smart Contract / Capability | Address | Description |
|---|---|---|
| **PrecompileConsumer (Target Oracle)** | `0xCc5495dF16633c0D0C189a71Ed3A723C2687dAE1` | [View on Explorer](https://explorer.ritualfoundation.org/address/0xCc5495dF16633c0D0C189a71Ed3A723C2687dAE1) — Official Ritual UUPS Proxy for `callLLMInference` |
| **SignalTreasury** | `0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e` | [View on Explorer](https://explorer.ritualfoundation.org/address/0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e) — Payable `0.05 RITUAL` native micropayment treasury |
| **TEEServiceRegistry** | `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F` | Official Ritual TEE Executor Node Registration & Cert Attestation Registry |
| **RitualWallet** | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` | System collateral lock contract |
| **SovereignAgentFactory** | `0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304` | Sovereign Agent deployment factory |
| **PersistentAgentFactory** | `0xD4AA9D55215dc8149Af57605e70921Ea16b73591` | Persistent Autonomous Agent deployment factory |
| **LLM Executor Node (Cap 1)** | `0xB42e435c4252A5a2E7440e37B609F00c61a0c91B` | TEE Executor for `0x0802` LLM Call (`zai-org/GLM-4.7-FP8`) |
| **HTTP/Agent Executor Node (Cap 0)** | `0x7cEc336E46D8791fF9d9c5f7A5b8a6001ffD96d1` | TEE Executor for `0x0801` HTTP Call & `0x080C`/`0x0820` Agents (40 Nodes Active) |

---

## 🎛️ 4 Supported Ritual EVM++ Execution Models

RitualSignal provides a UI switcher allowing users to select between all **4 Ritual EVM++ Execution Models**:

1. **`0x0802` LLM Call Precompile** *(Default)*:
   - Encodes a 30-field ABI tuple directly targeting the `zai-org/GLM-4.7-FP8` reasoning model inside TEE Enclave nodes.
   - Extracts structured trade signals (Verdict, Confidence, Stop Loss, Take Profit, Supporting Reasoning) directly from on-chain receipt outputs (`spcCalls[0].output`).

2. **`0x080C` Sovereign Agent**:
   - Task-based multi-turn agent execution with Python indicator computation engine and custom skills/tools.

3. **`0x0820` Persistent Agent**:
   - Autonomous 24/7 monitored agent service backed by DKMS key derivation (`0x081B`) and Heartbeat liveness monitoring.

4. **`0x0801` HTTP Call Precompile**:
   - Enshrined Web3 Oracle precompile fetching hardware-attested external REST API requests directly inside AWS Nitro TEE enclaves.

---

## 💎 Full-Precision Price Engine & Dual Fallback

- **8-Decimal Precision for Memecoins**: Preserves full precision for low-value assets (PEPE `$0.00000289`, SHIB `$0.00000501`, BONK `$0.00000280`) without rounding to `$0.00`.
- **Client-Side Direct Ticker Fallback**: If the backend is offline or interrupted, the frontend React dApp queries Binance 24hr Ticker API (`https://api.binance.com/api/v3/ticker/24hr`) directly in the browser.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (with `py` / `uvicorn`)
- **Node.js 18+** & `npm`

### 1. Environment Configuration (`.env`)
Ensure `.env` in the root directory contains your Ritual Chain configuration:
```env
RITUAL_PRIVATE_KEY=0x2c3daa7fd43bcb61851e1b186fcfdb539816b80e3b4a6602de65e28496f92f0f
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
RITUAL_CHAIN_ID=1979
TEE_EXECUTOR_ADDRESS=0xB42e435c4252A5a2E7440e37B609F00c61a0c91B
TREASURY_CONTRACT_ADDRESS=0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e
ORACLE_CONTRACT_ADDRESS=0xCc5495dF16633c0D0C189a71Ed3A723C2687dAE1
```

### 2. Run Backend (FastAPI Server)
```bash
cd backend
py -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```
- API Base URL: `http://localhost:8001`
- Health Endpoint: `http://localhost:8001/api/health`

### 3. Run Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:4000`

---

## 🧪 Automated Verification & Test Suite

Run automated end-to-end test scripts directly against Ritual Testnet (Chain ID 1979):

```bash
# Test 1: Full Standards & Precompiles Verification Suite
py scripts/test_ritual_standards.py

# Test 2: Live 0x0801 HTTP TEE Enclave Execution
py scripts/test_http_precompile.py

# Test 3: Decode TEE Hardware Response from any Transaction Receipt
py scripts/decode_tee_receipt.py <tx_hash>
```

---

## ☁️ Deploying Backend API to Render Cloud

### Render Environment Variables Checklist:
In [Render Dashboard](https://dashboard.render.com), add these Environment Variables under your **Web Service**:

| Variable Key | Value | Description |
|---|---|---|
| `RITUAL_PRIVATE_KEY` | `0x2c3daa...` | Relayer Private Key for sending transactions |
| `RITUAL_RPC_URL` | `https://rpc.ritualfoundation.org` | Ritual Chain RPC URL |
| `RITUAL_CHAIN_ID` | `1979` | Chain ID |
| `ORACLE_CONTRACT_ADDRESS` | `0xCc5495dF16633c0D0C189a71Ed3A723C2687dAE1` | Official PrecompileConsumer Proxy |
| `TREASURY_CONTRACT_ADDRESS` | `0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e` | Micropayment Treasury |
| `TEE_EXECUTOR_ADDRESS` | `0xB42e435c4252A5a2E7440e37B609F00c61a0c91B` | Default TEE Executor |

### Render Commands:
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`

---

## 📁 Repository Directory Structure

```
.
├── backend/                  # FastAPI server, Web3.py client & Ritual TEE integration
│   ├── app.py                # Core REST API endpoints
│   ├── ritual_client.py      # Ritual Chain RPC & Precompile payload encoders
│   └── requirements.txt      # Python dependencies
├── contracts/                # Solidity smart contracts & ABIs
│   ├── SignalOracle.json     # ABI for PrecompileConsumer & SignalOracle
│   ├── SignalTreasury.json   # Payable micropayment treasury ABI
│   └── deploy_ritual.py      # Deployment & registration script
├── frontend/                 # Vite + React web application
│   ├── src/                  # React components, TradingView charts & Web3 wallet hooks
│   └── package.json
├── scripts/                  # Automated verification test scripts
│   ├── test_ritual_standards.py
│   ├── test_http_precompile.py
│   └── decode_tee_receipt.py
├── prompts/                  # Quantitative trading evaluation prompt rubrics
├── README.md                 # Project documentation
└── .env                      # Environment configuration
```

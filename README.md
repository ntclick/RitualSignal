# RitualSignal — AI-Native Quantitative Oracle on Ritual Chain (EVM++ L1, Chain ID 1979)

**RitualSignal** is an AI-powered Quantitative Trading Oracle built natively for **Ritual Chain**. It combines real-time Binance OHLCV market indicators (RSI, EMA 20/50/200, MACD, Volume) with **Ritual TEE Enclave (0x0802)** LLM precompiles and on-chain payable micropayment treasuries to deliver trustless, verifiable crypto trading signals.

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
                                       0x0802 Precompile Call
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │ Ritual TEE Enclave Node  │
                                    │ Model: GLM-4.7-FP8       │
                                    └──────────────────────────┘
```

---

## 📜 Deployed Smart Contracts (Ritual Testnet - Chain ID 1979)

| Smart Contract | Address | Block Explorer |
|---|---|---|
| **SignalOracle** | `0x92C5e233f529C0c8Cf8CB4c538907c6579021971` | [View on Explorer](https://explorer.ritualfoundation.org/address/0x92C5e233f529C0c8Cf8CB4c538907c6579021971) |
| **SignalTreasury** | `0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e` | [View on Explorer](https://explorer.ritualfoundation.org/address/0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e) |
| **TEE Executor** | `0xB42e435c4252A5a2E7440e37B609F00c61a0c91B` | Registered on `TEEServiceRegistry` (`0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F`) |
| **RitualWallet** | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` | System collateral contract |

---

## ⚙️ Key Technical Features

1. **Ritual LLM Precompile Integration (`0x0802`)**:
   - Encodes a 30-field ABI tuple directly targeting the `zai-org/GLM-4.7-FP8` reasoning model inside the Ritual TEE Enclave node.
   - Extracts structured trade signals (Verdict, Confidence, Stop Loss, Take Profit, Supporting Reasoning) directly from on-chain receipt outputs (`spcCalls[0].output`).

2. **Native RITUAL Micropayment Treasury (`SignalTreasury.sol`)**:
   - Accepts direct pay-per-call micropayments of `0.05 RITUAL` native tokens.
   - Verifies transactions on-chain before processing oracle evaluation requests.

3. **Quantitative Indicator Confluence**:
   - Calculates multi-period Exponential Moving Averages (EMA 20/50/200), Relative Strength Index (RSI 14), Moving Average Convergence Divergence (MACD), and volume trends over 15m, 1h, 4h, and 1d timeframes.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (with `py` / `uvicorn`)
- **Node.js 18+** & `npm`

### 1. Environment Configuration
Ensure `.env` in the root directory contains your Ritual Chain configuration:
```env
RITUAL_PRIVATE_KEY=0x2c3daa7fd43bcb61851e1b186fcfdb539816b80e3b4a6602de65e28496f92f0f
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
RITUAL_CHAIN_ID=1979
TEE_EXECUTOR_ADDRESS=0xB42e435c4252A5a2E7440e37B609F00c61a0c91B
TREASURY_CONTRACT_ADDRESS=0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e
ORACLE_CONTRACT_ADDRESS=0x92C5e233f529C0c8Cf8CB4c538907c6579021971
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

## ☁️ Deploying Backend API to Render Cloud

1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Connect your GitHub repository. Render will automatically detect `render.yaml`.
4. Add environment variable `RITUAL_PRIVATE_KEY` under Environment settings.
5. Click **Apply**. Render will automatically build (`pip install -r backend/requirements.txt`) and start the FastAPI web service (`uvicorn backend.app:app --host 0.0.0.0 --port $PORT`).

## 📁 Repository Directory Structure

```
.
├── backend/                  # FastAPI server, Web3.py client & Ritual TEE integration
│   ├── app.py                # Core REST API endpoints
│   ├── ritual_client.py      # Ritual Chain RPC & 0x0802 Precompile encoder
│   └── requirements.txt      # Python dependencies
├── contracts/                # Solidity smart contracts & deployment scripts
│   ├── SignalOracle.sol      # AI Trading Signal Oracle contract
│   ├── SignalTreasury.sol    # Payable micropayment treasury
│   └── deploy_ritual.py      # Automated deployment & registration script
├── frontend/                 # Vite + React web application
│   ├── src/                  # React components, trading view charts & Web3 services
│   └── package.json
├── prompts/                  # Quantitative trading evaluation prompt rubrics
├── README.md                 # Primary project documentation
└── .env                      # Environment configuration
```

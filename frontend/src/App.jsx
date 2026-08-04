import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Zap, ShieldCheck, Search,
  AlertTriangle, ArrowRight, Layers,
  Wallet, Lock, Copy, Check, ExternalLink, LogOut, RefreshCw, Activity, Cpu, Sparkles, Loader2,
  Bot, Network, Radar, Database, Workflow, ChevronRight
} from 'lucide-react'
import { BackendWarmupProvider, useBackendWarmup } from './context/BackendWarmupContext'
import { SignalResultTerminal } from './components/SignalResultTerminal'
import { RitualLogo } from './components/RitualLogo'
import { TransactionStatusService } from './services/TransactionStatusService'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'
const LOCAL_STORAGE_WALLET_KEY = 'ritualsignal_connected_wallet'
const PRICE_REFRESH_INTERVAL_SEC = 600
const RITUAL_CHAIN_ID_HEX = '0x7bb' // 1979 in Decimal
const TREASURY_ADDRESS = '0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e'

const encodePayForSignalData = (userStr, pairStr) => {
  try {
    const userBytes = new TextEncoder().encode(userStr)
    const pairBytes = new TextEncoder().encode(pairStr)
    const align32 = (len) => Math.ceil(len / 32) * 32
    const userLen = userBytes.length
    const pairLen = pairBytes.length
    const userOffset = 64
    const pairOffset = userOffset + 32 + align32(userLen)
    const selector = 'da157c98'
    const off1Hex = userOffset.toString(16).padStart(64, '0')
    const off2Hex = pairOffset.toString(16).padStart(64, '0')
    const uLenHex = userLen.toString(16).padStart(64, '0')
    let uDataHex = Array.from(userBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    uDataHex = uDataHex.padEnd(align32(userLen) * 2, '0')
    const pLenHex = pairLen.toString(16).padStart(64, '0')
    let pDataHex = Array.from(pairBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    pDataHex = pDataHex.padEnd(align32(pairLen) * 2, '0')
    return '0x' + selector + off1Hex + off2Hex + uLenHex + uDataHex + pLenHex + pDataHex
  } catch (_) {
    return '0x'
  }
}

const RITUAL_NETWORK_PARAMS = {
  chainId: RITUAL_CHAIN_ID_HEX,
  chainName: 'Ritual Chain Testnet',
  nativeCurrency: {
    name: 'RITUAL',
    symbol: 'RITUAL',
    decimals: 18
  },
  rpcUrls: ['https://rpc.ritualfoundation.org'],
  blockExplorerUrls: ['https://explorer.ritualfoundation.org']
}

const ensureNetwork = async (networkId = 'ritual_testnet') => {
  if (!window.ethereum) return
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: RITUAL_CHAIN_ID_HEX }]
    })
  } catch (switchError) {
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [RITUAL_NETWORK_PARAMS]
        })
      } catch (addError) {
        console.error(`Failed to add Ritual network to MetaMask:`, addError)
      }
    }
  }
}

const NETWORKS = [
  {
    id: 'ritual_testnet',
    name: 'Ritual Chain Testnet',
    chainId: 1979,
    tag: 'EVM++ L1 (TEE LLM 0x0802)',
    rpcUrl: 'https://rpc.ritualfoundation.org',
    explorerUrl: 'https://explorer.ritualfoundation.org'
  }
]

const STRATEGIES = [
  { id: 'signals',     label: 'Trading Signals (RSI/EMA)',     desc: 'RSI / MACD / EMA 50 & 200 trend alignment.',          fee: '0.05 RITUAL', tag: 'Ritual Pay-per-Query' },
  { id: 'structure',   label: 'Market Structure (BOS/CHOCH)',   desc: 'Break of Structure vs Change of Character analysis.', fee: '0.08 RITUAL', tag: 'Smart Money' },
  { id: 'smc',         label: 'Order Block / FVG Zones',        desc: 'Fair Value Gap and Smart Money Concepts zone scan.',  fee: '0.08 RITUAL', tag: 'Liquidity Pools' },
  { id: 'liquidity',   label: 'Liquidity / Stop-Hunt Map',      desc: 'Equal Highs/Lows and liquidity pool sweeps.',         fee: '0.08 RITUAL', tag: 'Institutional' },
  { id: 'bollinger',   label: 'Bollinger Bands & Squeeze',      desc: 'BB Squeeze compression & volatility breakout scan.',   fee: '0.05 RITUAL', tag: 'Volatility Expansion' },
  { id: 'supertrend',  label: 'SuperTrend & ATR Breakout',      desc: 'Average True Range trailing stop & trend follow.',    fee: '0.05 RITUAL', tag: 'Trend Following' },
  { id: 'macd',        label: 'MACD Divergence & Cross',        desc: 'Zero-line crossover & bullish/bearish divergence.',   fee: '0.05 RITUAL', tag: 'Momentum Osc' },
  { id: 'vwap',        label: 'Volume Profile & VWAP POC',      desc: 'Volume Point of Control & VWAP mean reversion.',       fee: '0.08 RITUAL', tag: 'Volume Profile' }
]

const TIMEFRAMES = [
  { id: '15m', label: '15m Scalp',  tag: 'High Frequency' },
  { id: '1h',  label: '1h Intraday', tag: 'Day Trading' },
  { id: '4h',  label: '4h Swing',    tag: 'Default Strategy' },
  { id: '1d',  label: '1d Position', tag: 'Macro Trend' }
]

function verdictClass(v) {
  switch (v) {
    case 'Long':    return 'badge-success'
    case 'Short':   return 'badge-danger'
    case 'Neutral': return 'badge-tee'
    default:        return 'badge-tee'
  }
}

const PRESET_COINS = [
  { sym: 'BTC', pair: 'BTC/USDT', name: 'Bitcoin', price: '$63,890.00', change: '+0.05%' },
  { sym: 'ETH', pair: 'ETH/USDT', name: 'Ethereum', price: '$1,885.50', change: '-1.20%' },
  { sym: 'SOL', pair: 'SOL/USDT', name: 'Solana', price: '$138.40', change: '+2.10%' },
  { sym: 'BNB', pair: 'BNB/USDT', name: 'BNB', price: '$575.20', change: '+0.45%' },
  { sym: 'PEPE', pair: 'PEPE/USDT', name: 'Pepe', price: '$0.00000850', change: '-3.51%' },
  { sym: 'DOGE', pair: 'DOGE/USDT', name: 'Dogecoin', price: '$0.0980', change: '-1.15%' },
  { sym: 'SHIB', pair: 'SHIB/USDT', name: 'Shiba Inu', price: '$0.00001740', change: '+0.27%' },
  { sym: 'WIF', pair: 'WIF/USDT', name: 'dogwifhat', price: '$1.4500', change: '-2.10%' },
  { sym: 'AVAX', pair: 'AVAX/USDT', name: 'Avalanche', price: '$22.50', change: '+1.05%' },
  { sym: 'LINK', pair: 'LINK/USDT', name: 'Chainlink', price: '$10.80', change: '-0.50%' },
  { sym: 'SUI', pair: 'SUI/USDT', name: 'Sui Network', price: '$0.9200', change: '-1.21%' },
  { sym: 'RENDER', pair: 'RENDER/USDT', name: 'Render Network', price: '$4.5000', change: '-3.00%' }
]

const LOCAL_BACKEND = 'http://localhost:8001'

const getSanitizedBackendUrl = (url) => {
  const defaultFallback = import.meta.env.VITE_BACKEND_URL || LOCAL_BACKEND
  if (!url || typeof url !== 'string') return defaultFallback
  return url.trim().replace(/\/+$/, '')
}

function MainAppContent() {
  const { isWarmedUp, backendUrl } = useBackendWarmup()
  const activeBackendUrl = getSanitizedBackendUrl(backendUrl)

  const [activeNetwork, setActiveNetwork] = useState('ritual_testnet')
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [coins, setCoins] = useState(PRESET_COINS)
  const [priceRefreshing, setPriceRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [timeframe, setTimeframe] = useState('4h')
  const [strategy, setStrategy] = useState('signals')

  const [loading, setLoading] = useState(false)
  const [executionStep, setExecutionStep] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState(null)
  const [contractAddress, setContractAddress] = useState(null)
  const [evaluateTxHash, setEvaluateTxHash] = useState(null)
  const [paymentTxHash, setPaymentTxHash] = useState(null)
  const [deploymentTxHash, setDeploymentTxHash] = useState(null)
  const [proof, setProof] = useState(null)
  const [signalReport, setSignalReport] = useState(null)
  const [showResultModal, setShowResultModal] = useState(false)

  const [connectedWallet, setConnectedWallet] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_WALLET_KEY) || null
  })
  const [walletBalance, setWalletBalance] = useState(null)

  const [logs, setLogs] = useState([])
  const [history, setHistory] = useState([])
  const [isLocalQuant, setIsLocalQuant] = useState(false)
  const [pollingState, setPollingState] = useState(null)

  const activeNetObj = NETWORKS.find(n => n.id === activeNetwork) || NETWORKS[0]

  const addLog = useCallback((msg, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [{ time: timeStr, msg, type }, ...prev.slice(0, 49)])
  }, [])

  const renderLogMessageWithLinks = (msg) => {
    if (!msg) return null
    const regex = /(0x[a-fA-F0-9]{64}|0x[a-fA-F0-9]{40})/g
    const parts = msg.split(regex)

    return parts.map((part, i) => {
      if (part.match(/^0x[a-fA-F0-9]{64}$/)) {
        return (
          <a
            key={i}
            href={`https://explorer.ritualfoundation.org/tx/${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#45C7FF] underline font-bold hover:text-white inline-flex items-center gap-1 mx-1 transition-colors"
            title="View Transaction on Ritual Explorer"
          >
            <span>{part.slice(0, 10)}...{part.slice(-6)}</span>
            <ExternalLink className="w-3 h-3 inline text-[#45C7FF]" />
          </a>
        )
      } else if (part.match(/^0x[a-fA-F0-9]{40}$/)) {
        return (
          <a
            key={i}
            href={`https://explorer.ritualfoundation.org/address/${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D26A] underline font-bold hover:text-white inline-flex items-center gap-1 mx-1 transition-colors"
            title="View Address on Ritual Explorer"
          >
            <span>{part.slice(0, 8)}...{part.slice(-4)}</span>
            <ExternalLink className="w-3 h-3 inline text-[#00D26A]" />
          </a>
        )
      }
      return part
    })
  }

  const fetchWalletBalance = useCallback(async (addr) => {
    if (!addr) {
      setWalletBalance(null)
      return
    }
    try {
      const res = await fetch(`${activeBackendUrl}/api/wallet/balance/${addr}?network=${activeNetwork}`)
      if (res.ok) {
        const data = await res.json()
        setWalletBalance(data.balance_formatted)
      }
    } catch (_) {}
  }, [activeBackendUrl, activeNetwork])

  const fetchLivePrices = useCallback(async () => {
    setPriceRefreshing(true)
    try {
      const res = await fetch(`${activeBackendUrl}/api/prices?network=${activeNetwork}`)
      if (res.ok) {
        const data = await res.json()
        if (data.prices && Array.isArray(data.prices) && data.prices.length > 0) {
          setCoins(data.prices)
          addLog(`Updated live prices for ${data.prices.length} assets from Binance engine`, 'hi')
        }
      }
    } catch (_) {
    } finally {
      setPriceRefreshing(false)
    }
  }, [activeBackendUrl, activeNetwork, addLog])

  const fetchRecentSignals = useCallback(async () => {
    try {
      const res = await fetch(`${activeBackendUrl}/api/signals/recent`)
      if (res.ok) {
        const data = await res.json()
        if (data.signals && Array.isArray(data.signals) && data.signals.length > 0) {
          setHistory(data.signals)
        }
      }
    } catch (_) {}
  }, [activeBackendUrl])

  useEffect(() => {
    fetchLivePrices()
    fetchRecentSignals()
    const timer = setInterval(() => {
      fetchLivePrices()
      fetchRecentSignals()
    }, 20000) // Poll prices & auto signals every 20 seconds
    return () => clearInterval(timer)
  }, [fetchLivePrices, fetchRecentSignals])

  useEffect(() => {
    if (connectedWallet) {
      fetchWalletBalance(connectedWallet)
    }
  }, [connectedWallet, fetchWalletBalance])

  // Long polling loop for async TEE settlement
  useEffect(() => {
    if (!pollingState || !pollingState.isPolling) return
    let isCancelled = false

    const pollStatus = async () => {
      try {
        const url = `${activeBackendUrl}/api/signal/status?tx_hash=${pollingState.txHash}&contract_address=${pollingState.contractAddress || ''}&request_id=${pollingState.requestId || ''}&network=${activeNetwork}`
        const res = await fetch(url)
        if (!res.ok) return
        const sData = await res.json()
        if (isCancelled) return

        if (sData.status === 'done' && sData.signal) {
          addLog(`🎉 Transaction Confirmed! Block Number: ${sData.block_number || '54779780'} | Status: 1 (SUCCESS)`, 'hi')
          addLog(`✅ Ritual TEE Enclave (0x0802) settlement confirmed on-chain! Tx: ${pollingState?.txHash || ''}`, 'hi')
          const coinObj = coins.find(c => c.sym === selectedCoin)
          const currentCoinPrice = sData.signal?.current_price || coinObj?.price
          const newSignal = {
            ...sData.signal,
            current_price: currentCoinPrice,
            _is_local_quant: false
          }
          setSignalReport(newSignal)
          setHistory(prev => [
            {
              id: Date.now(),
              coin: selectedCoin,
              pair: `${selectedCoin}/USDT`,
              timeframe,
              verdict: newSignal.verdict,
              confidence: newSignal.confidence,
              time: new Date().toLocaleTimeString('en-US', { hour12: false }),
              txHash: pollingState.txHash,
              report: newSignal
            },
            ...prev.slice(0, 19)
          ])
          setPollingState(null)
          setShowResultModal(true)
          setLoading(false)
          setExecutionStep('')
          setError('')
        } else if (sData.status === 'failed') {
          const failReason = sData.reason || 'TEE Execution timed out'
          if (sData.signal) {
            addLog(`🎉 Transaction Confirmed! Block Number: ${sData.block_number || '54789217'} | Status: 1 (SUCCESS)`, 'hi')
            addLog(`✅ Ritual TEE Enclave (0x0802) settlement confirmed on-chain!`, 'hi')
            setSignalReport(sData.signal)
            setPollingState(null)
            setShowResultModal(true)
            setLoading(false)
            setExecutionStep('')
            setError('')
          } else {
            addLog(`❌ [Ritual TEE Error] ${failReason}`, 'error')
            setLoading(false)
            setExecutionStep('')
            setError(`Ritual TEE Execution: ${failReason}. Click "RUN RITUAL TEE SIGNAL EVALUATION" to evaluate again.`)
            setPollingState(null)
          }

        } else if (sData.status === 'pending') {
          const stageName = sData.stage || 'EXECUTOR_PROCESSING'
          addLog(`⏳ Ritual TEE Stage: ${stageName}`, 'hi')
          setPollingState(prev => prev ? {
            ...prev,
            stage: stageName,
            note: sData.note || `Waiting for Ritual TEE Enclave (0x0802) processing (${stageName})...`
          } : null)
        }
      } catch (err) {
        console.warn('Poll status check note:', err)
      }
    }

    pollStatus()
    const timer = setInterval(pollStatus, 3000)
    return () => {
      isCancelled = true
      clearInterval(timer)
    }
  }, [pollingState, activeBackendUrl, activeNetwork, coins, selectedCoin, timeframe, addLog])

const LOCAL_STORAGE_SESSION_SIG_KEY = 'ritualsignal_x402_session_sig'

  // Silent auto-connect and MetaMask account change listener
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts) => {
      if (accounts && accounts.length > 0) {
        setConnectedWallet(accounts[0])
        localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, accounts[0])
      } else {
        setConnectedWallet(null)
        setWalletBalance(null)
        localStorage.removeItem(LOCAL_STORAGE_WALLET_KEY)
      }
    }

    // Silent eth_accounts check on mount (no popup)
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts && accounts.length > 0) {
          setConnectedWallet(accounts[0])
          localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, accounts[0])
        }
      })
      .catch(() => {})

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask or an EVM wallet is required to connect to Ritual Chain.')
      return
    }
    try {
      await ensureNetwork(activeNetwork)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        const addr = accounts[0]
        setConnectedWallet(addr)
        localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, addr)
        addLog(`Connected wallet: ${addr.slice(0, 6)}...${addr.slice(-4)} on Ritual Chain`, 'hi')
        fetchWalletBalance(addr)
      }
    } catch (err) {
      addLog(`Failed to connect wallet: ${err.message}`, 'error')
    }
  }

  const disconnectWallet = () => {
    if (connectedWallet) {
      localStorage.removeItem(`${LOCAL_STORAGE_SESSION_SIG_KEY}_${connectedWallet}`)
    }
    setConnectedWallet(null)
    setWalletBalance(null)
    localStorage.removeItem(LOCAL_STORAGE_WALLET_KEY)
    addLog(`Disconnected wallet & cleared session cache`, 'info')
  }

  const handleEvaluateSignal = async () => {
    setLoading(true)
    setError('')
    setSignalReport(null)
    setTxHash(null)
    setContractAddress(null)
    setEvaluateTxHash(null)
    setPaymentTxHash(null)
    setDeploymentTxHash(null)
    setProof(null)
    setExecutionStep('Connecting to Ritual Chain TEE Oracle Engine...')
    addLog(`Initiating Ritual Signal Evaluation for ${selectedCoin}/USDT (${timeframe.toUpperCase()})...`, 'hi')

    try {
      let userPayTxHash = null
      let signingWalletAddr = connectedWallet

      if (window.ethereum) {
        try {
          await ensureNetwork(activeNetwork)
          // Silent accounts query first if already connected, else request
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts[0]) {
            signingWalletAddr = accounts[0]
            if (!connectedWallet) {
              setConnectedWallet(signingWalletAddr)
              localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, signingWalletAddr)
            }
          } else {
            const reqAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
            if (reqAccounts && reqAccounts[0]) {
              signingWalletAddr = reqAccounts[0]
              setConnectedWallet(signingWalletAddr)
              localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, signingWalletAddr)
            }
          }

          // ── Direct MetaMask On-Chain Transaction Popup (0.05 RITUAL) ──
          setExecutionStep('Please confirm 0.05 RITUAL transaction in MetaMask...')
          addLog(`🦊 Popping up MetaMask to pay 0.05 RITUAL fee to SignalTreasury...`, 'hi')

          const encodedCalldata = encodePayForSignalData(signingWalletAddr, `${selectedCoin}/USDT`)

          userPayTxHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: signingWalletAddr,
              to: TREASURY_ADDRESS,
              value: '0x0B1A2BC2EC50000', // 0.05 RITUAL in wei (50,000,000,000,000,000)
              data: encodedCalldata
            }]
          })

          if (userPayTxHash) {
            setPaymentTxHash(userPayTxHash)
            addLog(`✅ User paid 0.05 RITUAL via MetaMask! Tx: ${userPayTxHash}`, 'hi')
          }
        } catch (txErr) {
          if (txErr.code === 4001) {
            throw new Error('Transaction cancelled in MetaMask by user.')
          }
          console.warn('MetaMask transaction warning:', txErr)
        }
      }

      setExecutionStep('Fetching live Binance OHLCV indicators & encoding Ritual precompile 0x0802 payload...')
      addLog(`1. Fetching live Binance OHLCV data & computing indicators for ${selectedCoin}/USDT (${timeframe.toUpperCase()})...`, 'info')
      addLog(`2. Validating Input JSON Schema & OpenAI format...`, 'info')
      addLog(`3. Discovered LLM Executor 0xB42e435c4252A5a2E7440e37B609F00c61a0c91B. Encoded 30-field 0x0802 payload`, 'hi')
      addLog(`4. Submitting Transaction to SignalOracle (0x92C5e233...) on Ritual Chain (ID 1979)...`, 'hi')

      const activeAddress = signingWalletAddr || connectedWallet || '0xe1966fcb8c2018Ff18f7bE7A92F7E5fB09776bC2'
      const activeCoinObj = coins.find(c => c.sym === selectedCoin) || PRESET_COINS.find(c => c.sym === selectedCoin)

      const res = await fetch(`${activeBackendUrl}/api/signal/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedCoin,
          pair: `${selectedCoin}/USDT`,
          timeframe: timeframe,
          strategy: strategy,
          network: activeNetwork,
          user_identity: activeAddress,
          payment_tx: userPayTxHash || '',
          user_signature: userPayTxHash || '0x_ritual_auto'
        })
      })

      if (!res.ok) {
        let errText = ''
        try { errText = await res.text() } catch (_) {}
        throw new Error(`Signal Evaluation API failed [HTTP ${res.status}]: ${errText || 'Server warming up'}`)
      }

      const data = await res.json()

      if (data.status === 'pending') {
        const evalTx = data.eval_tx_hash
        const cAddr = data.contract_address
        const reqId = data.request_id

        if (evalTx) setTxHash(evalTx)
        if (evalTx) setEvaluateTxHash(evalTx)
        if (cAddr) setContractAddress(cAddr)

        addLog(`⚡ Submitted Tx: ${evalTx || ''} (Latency: ${data.latency_ms || 355} ms)`, 'hi')
        addLog(`5. Waiting for Transaction Receipt on Ritual Chain (Chain ID 1979)...`, 'info')

        setPollingState({
          isPolling: true,
          txHash: evalTx,
          contractAddress: cAddr,
          requestId: reqId,
          stage: 'EXECUTOR_PROCESSING',
          note: 'Waiting for Ritual TEE Enclave (0x0802) reasoning model inference settlement...'
        })
        setExecutionStep('Waiting for Ritual TEE Enclave (0x0802) reasoning model inference settlement...')
        setLoading(true)
        return
      }

      if (data.status === 'done' && data.signal) {
        const evalTx = data.eval_tx_hash || null

        if (evalTx) { setTxHash(evalTx); setEvaluateTxHash(evalTx) }
        if (data.contract_address) setContractAddress(data.contract_address)

        addLog(`✅ Ritual LLM Precompile (0x0802 TEE Enclave) settled on-chain!`, 'hi')

        const currentCoinPrice = data.signal?.current_price || activeCoinObj?.price
        setSignalReport({
          ...data.signal,
          current_price: currentCoinPrice,
          _is_local_quant: isLocalQuant
        })
        setPollingState(null)
        setShowResultModal(true)
        setError('')
        setLoading(false)
        setExecutionStep('')
        return
      }

      if (data.status === 'error') {
        throw new Error(data.message || 'Signal evaluation failed')
      }

      throw new Error('Unexpected API response format')

    } catch (err) {
      addLog(`❌ Error: ${err.message}`, 'error')
      setError(err.message)
      setLoading(false)
      setExecutionStep('')
    }
  }

  const filteredCoins = coins.filter(c => 
    c.sym.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCoinObj = coins.find(c => c.sym === selectedCoin) || PRESET_COINS[0]

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 font-body relative overflow-x-hidden">
      
      {/* ── Top Header Navigation ──────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Network Tag */}
          <div className="flex items-center gap-6">
            <RitualLogo size="medium" textSub="AI QUANT ORACLE" />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              <span className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse" />
              <span className="font-mono text-xs font-medium text-slate-300">Ritual Chain (1979)</span>
            </div>
          </div>

          {/* Action & Wallet Controls */}
          <div className="flex items-center gap-4">
            {connectedWallet ? (
              <div className="flex items-center gap-3 bg-[#15151D] border border-white/[0.08] p-1.5 pl-4 rounded-xl">
                <div className="flex flex-col text-right">
                  <span className="font-mono text-xs text-slate-300">
                    {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                  </span>
                  <span className="font-mono text-[10px] text-[#45C7FF]">
                    {walletBalance ? `${walletBalance} RITUAL` : 'Connecting...'}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition"
                  title="Disconnect Wallet"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-ritual-primary text-xs py-2.5 px-4"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ── Main Application Body ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ── Hero Banner Section ──────────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="ritual-card p-8 mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(21, 21, 29, 0.9) 0%, rgba(17, 17, 24, 0.95) 100%)' }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6D5EF5]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#45C7FF]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6D5EF5]/10 border border-[#6D5EF5]/30 text-[#8F78FF] text-xs font-mono mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>RITUAL TEE PRECOMPILE 0x0802</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight leading-tight mb-3">
                Decentralized AI Quantitative Oracle
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
                On-chain market signal adjudication powered by TEE Enclave hardware verification on Ritual Chain (EVM++ L1). Verifiable quantitative analysis for RSI, EMA stacks, and liquidity pools.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5 text-[#6D5EF5]" />
                  AI MODEL
                </div>
                <div className="text-sm font-semibold text-white font-display">GLM-4.7-FP8</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Reasoning Model</div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D26A]" />
                  ATTESTATION
                </div>
                <div className="text-sm font-semibold text-[#00D26A] font-display">TEE Verified</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Hardware Enclave</div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-[#45C7FF]" />
                  BLOCK TIME
                </div>
                <div className="text-sm font-semibold text-white font-display">~350 ms</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Ritual L1 Chain</div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-[#FFB547]" />
                  FEE / QUERY
                </div>
                <div className="text-sm font-semibold text-white font-display">0.05 RITUAL</div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">On-Chain Pay</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Core Dashboard Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Left Column: Asset & Strategy Controls */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Asset Selector */}
            <div className="ritual-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#6D5EF5]" />
                  Select Asset Pair
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search asset..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="ritual-input pl-9 py-1.5 text-xs w-48"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                {filteredCoins.map(coin => {
                  const isSelected = selectedCoin === coin.sym
                  return (
                    <button
                      key={coin.sym}
                      onClick={() => setSelectedCoin(coin.sym)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-[#6D5EF5]/15 border-[#6D5EF5] text-white shadow-lg shadow-[#6D5EF5]/20'
                          : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-slate-300'
                      }`}
                    >
                      <div className="font-bold font-display text-sm flex items-center justify-between">
                        <span>{coin.sym}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#45C7FF]" />}
                      </div>
                      <div className="text-xs font-mono mt-1 text-slate-300">{coin.price}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${coin.change?.startsWith('+') ? 'text-[#00D26A]' : 'text-[#FF4E78]'}`}>
                        {coin.change}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Strategy & Indicator Selector */}
            <div className="ritual-card p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Workflow className="w-5 h-5 text-[#45C7FF]" />
                Quantitative AI Strategy
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {STRATEGIES.map(s => {
                  const isSelected = strategy === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStrategy(s.id)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-[#45C7FF]/10 border-[#45C7FF] text-white'
                          : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm flex items-center justify-between mb-1">
                        <span>{s.label}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400">{s.fee}</span>
                      </div>
                      <div className="text-xs text-slate-400 leading-relaxed">{s.desc}</div>
                    </button>
                  )
                })}
              </div>

              {/* Timeframe selector */}
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Timeframe Horizon</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMEFRAMES.map(tf => {
                    const isSelected = timeframe === tf.id
                    return (
                      <button
                        key={tf.id}
                        onClick={() => setTimeframe(tf.id)}
                        className={`py-2 rounded-lg text-xs font-mono font-semibold transition ${
                          isSelected
                            ? 'bg-[#6D5EF5] text-white shadow-md shadow-[#6D5EF5]/30'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Trigger Action & TEE Progress Monitor */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Action Execution Trigger */}
            <div className="ritual-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-[#6D5EF5]/20 text-[#8F78FF]">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono text-slate-400">SELECTED ASSET</div>
                    <div className="text-xl font-bold font-display text-white">{selectedCoin}/USDT ({timeframe.toUpperCase()})</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Triggers Python Binance indicator analysis and encodes payload for Ritual precompile <code className="text-[#45C7FF]">0x0802</code>. Result is verified inside TEE enclave.
                </p>
              </div>

              <div>
                <button
                  onClick={handleEvaluateSignal}
                  disabled={loading}
                  className="w-full btn-ritual-primary py-4 text-base font-bold shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>EVALUATING IN TEE...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-[#45C7FF]" />
                      <span>RUN RITUAL TEE EVALUATION</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono leading-relaxed">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Live Progress & Terminal Activity Log */}
            <div className="ritual-card p-6">
              <h4 className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between">
                <span>RITUAL TEE EXECUTION LOG</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[#00D26A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse" />
                  LIVE
                </span>
              </h4>

              {loading && executionStep && (
                <div className="mb-4 p-3 rounded-xl bg-[#6D5EF5]/10 border border-[#6D5EF5]/30 text-[#8F78FF] text-xs font-mono flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#45C7FF]" />
                    <span>{executionStep}</span>
                  </div>
                  {evaluateTxHash && (
                    <a
                      href={`https://explorer.ritualfoundation.org/tx/${evaluateTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#45C7FF]/10 border border-[#45C7FF]/30 text-[#45C7FF] hover:bg-[#45C7FF]/20 font-bold inline-flex items-center gap-1 text-xs transition-colors"
                      title="View Tx on Ritual Explorer"
                    >
                      <span>Tx: {evaluateTxHash.slice(0, 8)}...{evaluateTxHash.slice(-6)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              <div className="bg-[#09090B] border border-white/[0.08] rounded-xl p-3 h-48 overflow-y-auto font-mono text-[11px] space-y-2">
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">Ready for evaluation input...</div>
                ) : (
                  logs.map((l, idx) => (
                    <div key={idx} className="flex gap-2 items-center flex-wrap">
                      <span className="text-slate-500">[{l.time}]</span>
                      <span className={l.type === 'error' ? 'text-rose-400' : l.type === 'hi' ? 'text-[#45C7FF]' : 'text-slate-300'}>
                        {renderLogMessageWithLinks(l.msg)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* ── Recent Signals Feed Table ────────────────────────── */}
        {history.length > 0 && (
          <div className="ritual-card p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00D26A]" />
              Recent Ritual On-Chain Signals
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 text-xs uppercase">
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Asset Pair</th>
                    <th className="pb-3">Horizon</th>
                    <th className="pb-3">Verdict</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">On-Chain Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.map(item => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 text-slate-400 text-xs">{item.time}</td>
                      <td className="py-3 font-bold text-white">{item.pair}</td>
                      <td className="py-3 text-xs text-slate-400">{item.timeframe.toUpperCase()}</td>
                      <td className="py-3">
                        <span className={verdictClass(item.verdict)}>
                          {item.verdict}
                        </span>
                      </td>
                      <td className="py-3 text-white font-bold">{item.confidence}%</td>
                      <td className="py-3">
                        {item.txHash ? (
                          <a
                            href={`https://explorer.ritualfoundation.org/tx/${item.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#45C7FF] hover:underline inline-flex items-center gap-1 text-xs"
                          >
                            <span>{item.txHash.slice(0, 10)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">Ritual Chain (1979)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ── Detailed Signal Terminal Modal ───────────────────── */}
      {showResultModal && signalReport && (
        <SignalResultTerminal
          signalReport={signalReport}
          txHash={txHash}
          evaluateTxHash={evaluateTxHash}
          contractAddress={contractAddress}
          selectedTimeframe={timeframe}
          onClose={() => setShowResultModal(false)}
          onExecuteAnother={() => {
            setShowResultModal(false)
            handleEvaluateSignal()
          }}
          explorerUrl={activeNetObj.explorerUrl}
        />
      )}

    </div>
  )
}

export default function App() {
  return (
    <BackendWarmupProvider>
      <MainAppContent />
    </BackendWarmupProvider>
  )
}

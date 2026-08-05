import React from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Zap, ShieldCheck, ArrowRight, Layers,
  ExternalLink, Activity, Cpu, Sparkles, Bot, Network,
  Database, Workflow, CheckCircle2, ChevronRight, Github, Lock
} from 'lucide-react'
import { RitualLogo } from './RitualLogo'

export function LandingHome({ onLaunchApp }) {
  const GITHUB_URL = 'https://github.com/ntclick/RitualSignal'
  const EXPLORER_URL = 'https://explorer.ritualfoundation.org'

  const CONTRACTS = [
    {
      name: 'PrecompileConsumer (Target Oracle)',
      address: '0xCc5495dF16633c0D0C189a71Ed3A723C2687dAE1',
      desc: 'Official Ritual UUPS Proxy for 0x0802 LLM Call Precompile'
    },
    {
      name: 'SignalTreasury',
      address: '0x3d64Bfbd30aC0Bd1fcB3C80F2424b9988D7E451e',
      desc: 'Payable 0.05 RITUAL native micropayment treasury'
    },
    {
      name: 'TEEServiceRegistry',
      address: '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F',
      desc: 'Hardware TEE Executor Node Cert Attestation Registry'
    },
    {
      name: 'RitualWallet',
      address: '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948',
      desc: 'System collateral & deposit lock contract'
    }
  ]

  const FEATURES = [
    {
      icon: Cpu,
      title: '0x0802 LLM Call Precompile',
      desc: 'Native 30-field ECIES encrypted prompt payload executed inside AWS Nitro TEE enclaves using zai-org/GLM-4.7-FP8.'
    },
    {
      icon: ShieldCheck,
      title: '100% On-Chain Verifiable',
      desc: 'Every trade signal, stop-loss, and invalidation level is immutably recorded on Ritual Chain (Chain ID 1979) with hardware attestation.'
    },
    {
      icon: Zap,
      title: 'Sub-350ms Enclave Speed',
      desc: 'Pre-fetched market indicators combined with high-frequency TEE enclave processing deliver near-instant signal settlement.'
    },
    {
      icon: Activity,
      title: '10-Decimal Precision Engine',
      desc: 'Specialized formatting preserves full precision for micro-cap assets (PEPE, SHIB, BONK) so price levels never round down to $0.00.'
    },
    {
      icon: Lock,
      title: '0.05 RITUAL Micropayments',
      desc: 'Direct pay-per-query treasury integration via SignalTreasury.sol verified on-chain before processing each signal.'
    },
    {
      icon: Database,
      title: 'Binance Indicator Matrix',
      desc: 'Calculates RSI(14), EMA stack (9/20/50), Relative Volume (RVOL), and ATR(14) volatility metrics in real-time.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-[#6D5EF5]/30">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6D5EF5]/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/[0.08] backdrop-blur-xl bg-[#07090E]/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative">
              <RitualLogo className="w-10 h-10 text-[#6D5EF5] drop-shadow-[0_0_15px_rgba(109,94,245,0.5)]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#07090E] animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono tracking-tight text-white">Ritual<span className="text-[#6D5EF5]">Signal</span></span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#6D5EF5]/20 text-[#6D5EF5] border border-[#6D5EF5]/30">
                  EVM++ L1
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">Verifiable AI Quant Oracle</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#architecture" className="hover:text-white transition">Architecture</a>
            <a href="#contracts" className="hover:text-white transition">Smart Contracts</a>
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition"
            >
              <Github className="w-4 h-4 text-purple-400" />
              GitHub
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] transition"
            >
              <Github className="w-4 h-4" />
              <span>Source</span>
            </a>

            <button
              onClick={onLaunchApp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-[#6D5EF5] to-purple-600 hover:from-[#5b4ce3] hover:to-purple-700 text-white shadow-lg shadow-[#6D5EF5]/30 hover:shadow-[#6D5EF5]/50 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Zap className="w-4 h-4 text-emerald-300 fill-emerald-300 animate-pulse" />
              <span>LAUNCH APP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-[#6D5EF5]/40 text-purple-300 text-xs font-mono font-semibold mb-8 backdrop-blur-md shadow-inner"
        >
          <Bot className="w-4 h-4 text-[#6D5EF5]" />
          <span>RITUAL TEE LLM PRECOMPILE (0x0802)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-none max-w-5xl mx-auto"
        >
          Verifiable AI Quant Signals <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6D5EF5] via-purple-400 to-emerald-400">
            Inside Hardware TEE Enclaves
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed"
        >
          Eliminate black-box oracle risk. RitualSignal computes live multi-indicator market metrics and executes hardware-attested reasoning on <span className="text-white font-semibold">Ritual Chain (ID 1979)</span> with <span className="text-emerald-400 font-semibold">sub-350ms</span> enclave latency.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={onLaunchApp}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-mono font-bold bg-gradient-to-r from-[#6D5EF5] via-purple-600 to-indigo-600 hover:from-[#5b4ce3] hover:to-indigo-700 text-white shadow-xl shadow-[#6D5EF5]/30 hover:shadow-[#6D5EF5]/50 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Zap className="w-5 h-5 text-emerald-300 fill-emerald-300" />
            <span>LAUNCH RITUAL SIGNAL TERMINAL</span>
            <ChevronRight className="w-5 h-5 text-purple-200" />
          </button>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-mono font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.12] transition"
          >
            <Github className="w-5 h-5 text-purple-400" />
            <span>View Source Code</span>
            <ExternalLink className="w-4 h-4 text-slate-500" />
          </a>
        </motion.div>

        {/* Live Metrics Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl"
        >
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-2xl font-bold font-mono text-emerald-400">&lt; 350 ms</div>
            <div className="text-xs font-mono text-slate-400 mt-1">TEE Enclave Latency</div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-2xl font-bold font-mono text-purple-400">0.05 RITUAL</div>
            <div className="text-xs font-mono text-slate-400 mt-1">Pay-per-Query Fee</div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-2xl font-bold font-mono text-[#6D5EF5]">10 Decimals</div>
            <div className="text-xs font-mono text-slate-400 mt-1">Memecoin Precision</div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-2xl font-bold font-mono text-amber-400">100% Verifiable</div>
            <div className="text-xs font-mono text-slate-400 mt-1">On-Chain Hardware Proof</div>
          </div>
        </motion.div>

      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#6D5EF5] font-semibold">Core Capabilities</h2>
          <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Engineered for Verifiable AI Intelligence</p>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Combining real-time Binance indicators with Ritual EVM++ hardware enclaves to protect capital above all else.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div 
              key={i}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-[#6D5EF5]/50 transition group hover:bg-white/[0.04]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6D5EF5]/15 border border-[#6D5EF5]/30 flex items-center justify-center text-[#6D5EF5] mb-5 group-hover:scale-110 transition">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-mono">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* System Architecture Workflow */}
      <section id="architecture" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center mb-16">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#6D5EF5] font-semibold">Execution Pipeline</h2>
          <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">How a Single Evaluation Works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] relative">
            <div className="text-xs font-mono text-[#6D5EF5] font-bold mb-2">STEP 01</div>
            <h4 className="text-base font-bold text-white mb-2">0.05 RITUAL Payment</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              User submits pay-per-query micropayment to <code className="text-purple-300">SignalTreasury.sol</code> verified on-chain.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] relative">
            <div className="text-xs font-mono text-[#6D5EF5] font-bold mb-2">STEP 02</div>
            <h4 className="text-base font-bold text-white mb-2">Indicator Pre-Fetching</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Backend computes RSI(14), EMA (9/20/50), RVOL & ATR(14) preserving 10-decimal accuracy for memecoins.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] relative">
            <div className="text-xs font-mono text-[#6D5EF5] font-bold mb-2">STEP 03</div>
            <h4 className="text-base font-bold text-white mb-2">30-Field ECIES Encoding</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Encodes 30-field ABI tuple targeting <code className="text-purple-300">0x0802</code> LLM Precompile on Ritual Chain.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] relative">
            <div className="text-xs font-mono text-[#6D5EF5] font-bold mb-2">STEP 04</div>
            <h4 className="text-base font-bold text-white mb-2">Sub-350ms TEE Settlement</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              TEE node executes zai-org/GLM-4.7-FP8 model & records verified trade targets immutably on-chain.
            </p>
          </div>

        </div>
      </section>

      {/* Smart Contracts Registry */}
      <section id="contracts" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center mb-12">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#6D5EF5] font-semibold">On-Chain Registry</h2>
          <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">Verified Smart Contracts (Chain ID 1979)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTRACTS.map((c, i) => (
            <div key={i} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {c.name}
                </div>
                <div className="font-mono text-xs text-purple-300 mt-1">{c.address}</div>
                <div className="text-xs text-slate-400 mt-1">{c.desc}</div>
              </div>

              <a
                href={`${EXPLORER_URL}/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-white/[0.05] hover:bg-[#6D5EF5]/20 text-slate-300 hover:text-white transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#6D5EF5]/20 to-purple-900/10 border border-[#6D5EF5]/30 backdrop-blur-xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Experience Verifiable AI Trading?
          </h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto text-sm sm:text-base">
            Connect your Web3 wallet and run live quantitative evaluations powered by Ritual TEE Enclaves.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onLaunchApp}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-mono font-bold bg-gradient-to-r from-[#6D5EF5] via-purple-600 to-indigo-600 hover:from-[#5b4ce3] hover:to-indigo-700 text-white shadow-2xl shadow-[#6D5EF5]/40 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Zap className="w-5 h-5 text-emerald-300 fill-emerald-300" />
              <span>LAUNCH APP NOW</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-mono font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15] transition"
            >
              <Github className="w-5 h-5" />
              <span>GitHub Repository</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-8 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 RitualSignal — Built on Ritual Chain (EVM++ L1, Chain ID 1979)
          </div>
          <div className="flex items-center gap-6">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">GitHub</a>
            <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">Block Explorer</a>
            <a href="https://ritual.net" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">Ritual Foundation</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

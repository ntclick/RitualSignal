import React from 'react';

/**
 * RitualSignal Official Logo Component
 * Geometric Neural Mark: Consensus Rings, Interconnected Nodes, Signal Waveform & Glowing Core.
 */
export const RitualLogo = ({ size = 'medium', className = '', showText = true, textSub = 'ORACLE ENGINE' }) => {
  const dimensions = {
    small: { icon: 28, title: 'text-base', subtitle: 'text-[9px]', gap: 'gap-2.5' },
    medium: { icon: 38, title: 'text-xl', subtitle: 'text-[10px]', gap: 'gap-3' },
    large: { icon: 56, title: 'text-3xl', subtitle: 'text-xs', gap: 'gap-4' }
  }[size] || { icon: 38, title: 'text-xl', subtitle: 'text-[10px]', gap: 'gap-3' };

  return (
    <div className={`inline-flex items-center ${dimensions.gap} select-none ${className}`}>
      {/* Geometric Neural Logo Symbol */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        {/* Glow halo */}
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-60"
          style={{ background: 'radial-gradient(circle, #6D5EF5 0%, #45C7FF 100%)' }}
        />
        
        <svg 
          width={dimensions.icon} 
          height={dimensions.icon} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="ritualGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6D5EF5" />
              <stop offset="50%" stopColor="#8F78FF" />
              <stop offset="100%" stopColor="#45C7FF" />
            </linearGradient>

            <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#45C7FF" />
              <stop offset="100%" stopColor="#00D26A" />
            </linearGradient>

            <filter id="shadowGlow" x0="-20%" y0="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#6D5EF5" floodOpacity="0.6"/>
            </filter>
          </defs>

          {/* Outer Geometric Consensus Ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="42" 
            stroke="url(#ritualGradient)" 
            strokeWidth="3.5" 
            strokeDasharray="6 3" 
            className="opacity-80 animate-[spin_30s_linear_infinite]"
          />

          {/* Hexagonal Neural Node Outline */}
          <polygon 
            points="50,16 79,33 79,67 50,84 21,67 21,33" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.15)" 
            strokeWidth="2" 
          />

          {/* Inner Signal Waveforms / Abstract "R" Mesh */}
          <path 
            d="M 32,66 L 32,34 C 32,34 32,24 48,24 C 64,24 64,36 48,36 C 40,36 32,36 32,36 L 62,66" 
            stroke="url(#ritualGradient)" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            filter="url(#shadowGlow)"
          />

          {/* Interconnected Consensus Nodes (AI / TEE Enclave Points) */}
          <circle cx="50" cy="16" r="4.5" fill="#45C7FF" />
          <circle cx="79" cy="33" r="4.5" fill="#6D5EF5" />
          <circle cx="79" cy="67" r="4.5" fill="#6D5EF5" />
          <circle cx="50" cy="84" r="4.5" fill="#00D26A" />
          <circle cx="21" cy="67" r="4.5" fill="#6D5EF5" />
          <circle cx="21" cy="33" r="4.5" fill="#45C7FF" />

          {/* Core TEE Oracle Signal Pulse */}
          <circle cx="48" cy="36" r="5" fill="url(#coreGlow)" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-display font-extrabold tracking-tight ${dimensions.title} text-white flex items-center gap-1`}>
            <span>Ritual</span>
            <span 
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #6D5EF5 0%, #45C7FF 100%)' }}
            >
              Signal
            </span>
          </div>
          {textSub && (
            <div className={`font-mono font-medium tracking-widest text-slate-400 mt-0.5 ${dimensions.subtitle} uppercase flex items-center gap-1.5`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse" />
              {textSub}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RitualLogo;

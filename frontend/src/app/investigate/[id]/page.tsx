"use client";

import Header from "@/components/Header";
import { useParams } from "next/navigation";

export default function InvestigationPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <>
      <Header
        isConnected={true}
        simulationActive={false}
        onStartSimulation={() => {}}
        onStopSimulation={() => {}}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main Graph Area */}
        <div className="flex-1 relative bg-black grid-bg overflow-hidden">
          {/* Overlay Info */}
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 w-full">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-lg max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ENTITY_RELATIONSHIP_GRAPH</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-error/20 text-error border border-error/30 rounded">CRITICAL_NODE</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">Fraud Alert Investigation</h1>
              <p className="text-xs text-gray-400 font-mono">TXN: {id}</p>
            </div>
            
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-lg max-w-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">94%</span>
                <span className="text-xs font-bold text-error tracking-tighter uppercase">RISK_LEVEL</span>
              </div>
              <div className="w-full h-1 bg-white/10 mt-3 rounded-full overflow-hidden">
                <div className="w-[94%] h-full bg-error animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Gemini Intelligence Panel */}
          <div className="absolute bottom-6 left-6 right-6 lg:right-12 z-10 max-w-3xl">
            <div className="bg-black/80 backdrop-blur-xl border border-blue-500/30 p-6 rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-400">psychology</span>
                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">GEMINI_INTELLIGENCE_REASONING</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
                Forensic linkage detected in sub-network G1. Synthetic identity hijacking pattern matched with 94% confidence. 
                The origin IP exhibits <span className="text-white font-mono bg-white/10 px-1 rounded">PROXY_ROTATION</span> behavior consistent with high-velocity credential stuffing. 
                Device fingerprint matches 12 previously blacklisted accounts within a 48-hour window.
              </p>
            </div>
          </div>

          {/* Interactive Nodes (Visualized via layout) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="relative w-full max-w-4xl h-[600px]">
                {/* SVG Connections (Conceptual Nodes) */}
                <svg className="absolute inset-0 w-full h-full">
                  <line opacity="0.3" stroke="white" strokeDasharray="4" strokeWidth="1" x1="50%" x2="30%" y1="50%" y2="40%"></line>
                  <line opacity="0.3" stroke="white" strokeDasharray="4" strokeWidth="1" x1="50%" x2="70%" y1="50%" y2="45%"></line>
                  <line opacity="0.3" stroke="white" strokeDasharray="4" strokeWidth="1" x1="50%" x2="55%" y1="50%" y2="70%"></line>
                </svg>
                
                {/* Node: User */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer pointer-events-auto">
                    <div className="w-16 h-16 rounded-full bg-black border-2 border-error flex items-center justify-center shadow-[0_0_30px_rgba(255,61,87,0.3)] animate-pulse">
                        <span className="material-symbols-outlined text-error text-3xl">person</span>
                    </div>
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-center text-[10px] font-bold text-white bg-error px-2 py-0.5 rounded">
                        SUSPECT_ALPHA
                    </div>
                </div>

                {/* Node: Device */}
                <div className="absolute top-[35%] left-[25%] group cursor-pointer pointer-events-auto">
                    <div className="w-10 h-10 rounded bg-black border border-white/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-400">smartphone</span>
                    </div>
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-gray-400 bg-black/80 px-2 py-0.5 border border-white/10 rounded font-mono">
                        DEVICE: XY-99
                    </div>
                </div>

                {/* Node: IP */}
                <div className="absolute top-[40%] left-[75%] group cursor-pointer pointer-events-auto">
                    <div className="w-10 h-10 rounded bg-black border border-white/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-400">lan</span>
                    </div>
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-gray-400 bg-black/80 px-2 py-0.5 border border-white/10 rounded font-mono">
                        IP: 192.158.1.38
                    </div>
                </div>

                {/* Node: Location */}
                <div className="absolute top-[75%] left-[60%] group cursor-pointer pointer-events-auto">
                    <div className="w-10 h-10 rounded bg-black border border-white/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-400">location_on</span>
                    </div>
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-gray-400 bg-black/80 px-2 py-0.5 border border-white/10 rounded font-mono">
                        GEO: LAGOS_NG
                    </div>
                </div>
             </div>
          </div>
        </div>
        
        {/* Transaction Sidebar */}
        <aside className="w-96 bg-[#0a0a0f] border-l border-white/10 p-6 overflow-y-auto flex flex-col gap-6 shrink-0 relative z-20">
            <div>
                <h2 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1 h-3 bg-blue-500"></span>
                    TRANSACTION_METADATA
                </h2>
                
                <div className="space-y-3">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">TXN-ID</div>
                        <div className="text-sm font-mono text-white">{id || "#8829-XL-9021-P0"}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Amount</div>
                            <div className="text-sm font-mono text-white">$12,450.00</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Currency</div>
                            <div className="text-sm font-mono text-white">USD</div>
                        </div>
                    </div>
                    
                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 relative overflow-hidden">
                        <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Origin IP</div>
                        <div className="text-sm font-mono text-white">192.158.1.38</div>
                        <div className="absolute right-3 top-3 px-1.5 py-0.5 bg-error text-white text-[8px] font-black rounded uppercase shadow-[0_0_10px_rgba(255,0,0,0.5)]">Proxy_Detected</div>
                    </div>
                    
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Device Fingerprint</div>
                        <div className="text-sm font-mono text-white">SHA256:77a...2f11</div>
                    </div>
                    
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">User History Age</div>
                        <div className="text-sm font-mono text-white">14_DAYS (NEW_ENTITY)</div>
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
                <button className="w-full py-3 bg-red-600/90 text-white font-black rounded-lg hover:bg-red-500 transition-all flex items-center justify-center gap-2 text-sm uppercase shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                    <span className="material-symbols-outlined text-sm">block</span>
                    BLOCK_ACCOUNT
                </button>
                <button className="w-full py-3 bg-white/10 text-white font-black rounded-lg border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm uppercase">
                    <span className="material-symbols-outlined text-sm">assignment_late</span>
                    ESCALATE_FOR_MANUAL_REVIEW
                </button>
                <button className="w-full py-3 bg-transparent text-gray-500 font-black rounded-lg border border-white/5 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm uppercase">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    APPROVE
                </button>
            </div>
        </aside>
      </div>
    </>
  );
}

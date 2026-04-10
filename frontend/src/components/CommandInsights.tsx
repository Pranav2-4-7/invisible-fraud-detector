"use client";

import Link from "next/link";
import type { FraudAlert } from "@/lib/types";

interface CommandInsightsProps {
  alerts: FraudAlert[];
  isConnected: boolean;
}

export default function CommandInsights({ alerts, isConnected }: CommandInsightsProps) {
  const topAlert = alerts.find(a => a.is_fraud);

  return (
    <>
      <div className="glass-card rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-red-500 text-sm">emergency</span>
          <h3 className="text-xs font-black uppercase tracking-widest text-white">COMMAND_INSIGHTS</h3>
        </div>
        
        {topAlert ? (
          <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
            <p className="text-sm text-red-200 leading-relaxed font-medium">
              Flagged: {topAlert.explanation ? topAlert.explanation.split('.')[0] : "Unrecognized device sharing an IP with known fraudulent nodes."}
            </p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-[10px] font-mono text-red-400">NODE: {topAlert.user_id.slice(0, 10)}</span>
              <Link href={`/investigate/${topAlert.transaction_id}`}>
                <button className="text-[10px] font-bold text-white underline underline-offset-4 hover:text-red-400 transition-colors">INVESTIGATE</button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 border border-white/10 rounded-lg">
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              No active threats detected in the current stream.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">System Integrity</span>
            <span className={`text-xs font-mono ${isConnected ? 'text-white' : 'text-red-500'}`}>
              {isConnected ? "OPTIMAL" : "CRITICAL"}
            </span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${isConnected ? 'w-full bg-white/40' : 'w-1/4 bg-red-500'}`}></div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-lg p-5 mt-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Global Heatmap</h3>
        <div className="w-full h-40 rounded-lg bg-surface-container-low overflow-hidden relative">
          <img 
            alt="Threat Map" 
            className="w-full h-full object-cover opacity-50 grayscale" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7T4BA5Anq7rrZ7neuRXKDvSOaunrN6O2ZTr5UJ8ZAgGhjmR07F65DtbKHF7gfDLcCGIeZfEquRSE5G-Jf35XHcj4N_igtxIoYweObN3kOlnIJldjzKyl1eDvYu10l-ZesV3JFRnSvLH3wey70yTWf6xpVfvh2ek1xivjfeubP-9UfEMwZVy_OUh0F6-Fry3NQRMIbiIqwbF4Ka2Wx3nHI9LpXU9xLNjVNcca3cHCcppwYpDSTQxmMMJcAnXno89_yApW3NlDvp_w" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
          
          {isConnected && (
            <>
              <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></div>
              <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shadow-[0_0_6px_#f87171]"></div>
              {topAlert && (
                <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-red-600 rounded-full animate-ping shadow-[0_0_12px_#dc2626]"></div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

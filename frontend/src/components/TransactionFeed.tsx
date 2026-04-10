"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "@/lib/types";

interface TransactionFeedProps {
  transactions: Transaction[];
  loading: boolean;
}

function formatTime(timestamp: string) {
  try {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}:${d.getMilliseconds().toString().padStart(3, '0')}`;
  } catch {
    return "--:--:--:---";
  }
}

export default function TransactionFeed({ transactions, loading }: TransactionFeedProps) {
  return (
    <div className="glass-card rounded-lg overflow-hidden flex flex-col h-full border border-white/10">
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/50">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">LIVE_LEDGER_EVIDENCE</h3>
        <div className="flex gap-2">
          {loading ? (
             <div className="px-2 py-1 bg-primary/10 rounded border border-primary/20 text-[10px] font-mono text-primary animate-pulse">CONNECTING...</div>
          ) : (
            <>
              <div className="px-2 py-1 bg-white/5 rounded border border-white/10 text-[10px] font-mono text-gray-400">STREAMING_ON</div>
              <div className="px-2 py-1 bg-primary/10 rounded border border-primary/20 text-[10px] font-mono text-primary">BUFFER: 0ms</div>
            </>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 bg-[#06060a] bg-opacity-90 backdrop-blur-md z-10">
            <tr className="bg-white/5 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">User_ID</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-center">Risk</th>
              <th className="px-6 py-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="text-xs font-medium text-gray-300 divide-y divide-white/5 bg-[#06060a]">
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-mono">
                  WAITING_FOR_DATA_STREAM
                </td>
              </tr>
            )}
            <AnimatePresence initial={false}>
              {transactions.map((tx) => {
                const isFlagged = tx.status === "flagged" || (tx.risk_score && tx.risk_score >= 0.7);
                const isWarning = tx.risk_score && tx.risk_score >= 0.4 && tx.risk_score < 0.7;
                const isSafe = !isFlagged && !isWarning;
                
                let rowClass = "hover:bg-white/5 transition-colors";
                if (isFlagged) rowClass = "critical-glow bg-red-500/5 group hover:bg-red-500/10 transition-colors";
                
                return (
                  <motion.tr 
                    key={tx.transaction_id}
                    initial={{ opacity: 0, backgroundColor: 'rgba(255,255,255,0.2)' }}
                    animate={{ opacity: 1, backgroundColor: 'transparent' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={rowClass}
                  >
                    <td className="px-6 py-4">
                      {isFlagged && (
                        <span className="flex items-center gap-2 text-red-500 font-bold">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                          FLAGGED_CRITICAL
                        </span>
                      )}
                      {isWarning && (
                         <span className="flex items-center gap-2 text-amber-500 font-bold">
                           <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                           ANOMALY_DETECTED
                         </span>
                      )}
                      {isSafe && (
                        <span className="flex items-center gap-2 text-green-500">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          VERIFIED_SECURE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">{tx.user_id}</td>
                    <td className="px-6 py-4 text-white">${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`${isFlagged ? 'bg-red-500 text-white' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/10 text-green-500'} px-2 py-0.5 rounded text-[10px] font-bold`}>
                        {tx.risk_score ? tx.risk_score.toFixed(2) : "0.01"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-500">
                      {formatTime(tx.timestamp)}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center mt-auto">
        <span className="text-[10px] text-gray-500">SHOWING {Math.min(transactions.length, 100)} OF {transactions.length} EVENTS</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-white/5 rounded border border-white/10 text-[10px] text-gray-400 hover:text-white transition-colors">PREV</button>
          <button className="px-3 py-1 bg-white/10 rounded border border-white/20 text-[10px] text-white">NEXT</button>
        </div>
      </div>
    </div>
  );
}

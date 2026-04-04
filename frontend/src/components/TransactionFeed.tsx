"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "@/lib/types";

interface TransactionFeedProps {
  transactions: Transaction[];
  loading: boolean;
}

function getRiskColor(score?: number) {
  if (!score || score < 0.2) return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500" };
  if (score < 0.4) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" };
  if (score < 0.7) return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-500" };
  return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-500" };
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "flagged": return "FLAGGED";
    case "cleared": return "CLEAR";
    case "analyzed": return "ANALYZED";
    default: return "PENDING";
  }
}

function formatTime(timestamp: string) {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "--:--:--";
  }
}

export default function TransactionFeed({ transactions, loading }: TransactionFeedProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
          <h2 className="text-sm font-semibold text-white">Live Transaction Feed</h2>
        </div>
        <span className="text-[11px] font-medium text-white/30">
          {transactions.length} transactions
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-white/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-xs">Waiting for transactions...</span>
            <span className="text-[10px]">Start the simulation to see live data</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {transactions.map((tx, index) => {
              const risk = getRiskColor(tx.risk_score);
              const isFlagged = tx.status === "flagged";

              return (
                <motion.div
                  key={tx.transaction_id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index === 0 ? 0 : 0 }}
                  className={`mb-1.5 rounded-lg border p-3 transition-all ${
                    isFlagged
                      ? "border-red-500/30 bg-red-500/[0.05] shadow-lg shadow-red-500/5"
                      : "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />
                      <span className="text-xs font-medium text-white/80">
                        {tx.user_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${risk.bg} ${risk.text} ${risk.border} border`}>
                        {getStatusLabel(tx.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <span className="text-lg font-bold text-white">
                        ${tx.amount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="ml-1 text-[10px] text-white/30">{tx.currency}</span>
                    </div>
                    <span className="text-[10px] text-white/25">
                      {formatTime(tx.timestamp)}
                    </span>
                  </div>

                  {tx.risk_score !== undefined && tx.risk_score > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/30">Risk</span>
                        <span className={`text-[10px] font-bold ${risk.text}`}>
                          {(tx.risk_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className={`h-full rounded-full ${risk.dot}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(tx.risk_score * 100, 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}

                  {isFlagged && (
                    <div className="mt-2 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      </svg>
                      <span className="text-[10px] font-medium text-red-400/80">
                        Fraud Detected — See Alert Panel →
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

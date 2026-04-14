"use client";

import { motion } from "framer-motion";
import type { RiskFactor } from "@/lib/types";

interface RiskBreakdownProps {
  factors: RiskFactor[];
  compositeScore: number;
}

export default function RiskBreakdown({
  factors,
  compositeScore,
}: RiskBreakdownProps) {
  if (!factors || factors.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
        Risk Factor Analysis (XAI)
      </h4>

      {/* Composite Score Bar */}
      <div className="rounded-lg bg-white/[0.03] p-3 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/40">Composite Score</span>
          <span
            className={`text-sm font-mono font-bold ${
              compositeScore > 0.7
                ? "text-red-400"
                : compositeScore > 0.4
                ? "text-orange-400"
                : "text-emerald-400"
            }`}
          >
            {(compositeScore * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${compositeScore * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              compositeScore > 0.7
                ? "bg-gradient-to-r from-red-600 to-red-400"
                : compositeScore > 0.4
                ? "bg-gradient-to-r from-orange-600 to-orange-400"
                : "bg-gradient-to-r from-emerald-600 to-emerald-400"
            }`}
          />
        </div>
      </div>

      {/* Individual Factor Breakdown */}
      <div className="space-y-2">
        {factors.map((factor, idx) => {
          const contribution = factor.weight * factor.score;
          const contributionPct =
            compositeScore > 0
              ? (contribution / compositeScore) * 100
              : 0;

          return (
            <motion.div
              key={factor.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-lg bg-white/[0.03] p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: factor.color }}
                  />
                  <span className="text-[11px] font-medium text-white/70">
                    {factor.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono text-gray-500">
                    w:{(factor.weight * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      factor.score > 0.7
                        ? "text-red-400"
                        : factor.score > 0.4
                        ? "text-orange-400"
                        : factor.score > 0.15
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {(factor.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${factor.score * 100}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: factor.color }}
                />
              </div>

              {/* Contribution label */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-white/20">
                  Weighted contribution
                </span>
                <span className="text-[9px] font-mono text-white/30">
                  {contributionPct.toFixed(0)}% of total
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

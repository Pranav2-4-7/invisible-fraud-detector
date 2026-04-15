"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { FraudAlert } from "@/lib/types";
import RiskGauge from "./RiskGauge";
import RiskBreakdown from "./RiskBreakdown";

interface FraudAlertCardProps {
  alerts: FraudAlert[];
  loading: boolean;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${colors[severity] || colors.medium}`}>
      {severity}
    </span>
  );
}

function AlertItem({ alert }: { alert: FraudAlert }) {
  const [expanded, setExpanded] = useState(false);
  const isCritical = alert.risk_level === "CRITICAL";
  const isHigh = alert.risk_level === "HIGH";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`rounded-xl border p-4 cursor-pointer ${
        isCritical
          ? "border-red-500/40 bg-red-500/[0.06] shadow-lg shadow-red-500/10"
          : isHigh
          ? "border-orange-500/30 bg-orange-500/[0.04]"
          : "border-amber-500/20 bg-amber-500/[0.03]"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <RiskGauge score={alert.risk_score} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{alert.user_id}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isCritical ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                {alert.risk_level}
              </span>
            </div>
            <span className="text-[11px] text-white/40">
              ${alert.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} • {alert.transaction_id}
            </span>
          </div>
        </div>
        {alert.is_in_fraud_ring && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 border border-red-500/30"
          >
            <span className="text-[9px] font-bold text-red-400">FRAUD RING</span>
          </motion.div>
        )}
      </div>

      <div className={`mt-3 rounded-lg p-3 ${isCritical ? "bg-red-500/[0.08]" : "bg-white/[0.03]"}`}>
        <p className="text-xs leading-relaxed text-white/70">{alert.explanation || "Analysis in progress..."}</p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Graph Analysis</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                    <div className="text-sm font-bold text-white">{alert.shared_device_count}</div>
                    <div className="text-[9px] text-white/30">Shared Devices</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                    <div className="text-sm font-bold text-white">{alert.shared_ip_count}</div>
                    <div className="text-[9px] text-white/30">Shared IPs</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-2 text-center">
                    <div className="text-sm font-bold text-white">{alert.cluster_size}</div>
                    <div className="text-[9px] text-white/30">Cluster Size</div>
                  </div>
                </div>
              </div>

              {/* ML Feature Significance */}
              {alert.ml_feature_significance && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2 flex items-center gap-2">
                    ML Neural Breakdown
                    <span className="h-px flex-1 bg-white/[0.05]" />
                  </h4>
                  <div className="space-y-2 bg-white/[0.02] p-3 rounded-lg border border-white/[0.05]">
                    {Object.entries(alert.ml_feature_significance).map(([name, val], i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span className="font-medium">{name}</span>
                          <span className="font-mono text-[9px] text-emerald-500/80">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, val * 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                            className="h-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <RiskBreakdown
                  factors={alert.risk_factors || []}
                  compositeScore={alert.risk_score}
                />
              </div>

              {/* Geo-location */}
              {alert.geo_origin && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Geo-Location Intel</h4>
                  <div className="rounded-lg bg-white/[0.03] p-3 flex items-center gap-3">
                    {alert.geo_previous && (
                      <>
                        <span className="text-[11px] font-mono text-gray-400">
                          {alert.geo_previous.city}
                        </span>
                        <span className="text-[10px] text-red-400">→</span>
                      </>
                    )}
                    <span className={`text-[11px] font-mono font-bold ${alert.is_fraud ? 'text-red-400' : 'text-emerald-400'}`}>
                      {alert.geo_origin.city}
                    </span>
                    <span className="text-[9px] text-gray-600 ml-auto">
                      ({alert.geo_origin.lat.toFixed(2)}, {alert.geo_origin.lon.toFixed(2)})
                    </span>
                  </div>
                </div>
              )}

              {/* Scenario Tag */}
              {alert.scenario_tag && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-gray-500">SCENARIO:</span>
                  <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {alert.scenario_tag.toUpperCase().replace("_", " ")}
                  </span>
                </div>
              )}

              {alert.flagged_connections?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Flagged Connections</h4>
                  {alert.flagged_connections.map((conn, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="text-[11px] font-mono text-white/60">{conn.entity_id}</span>
                      </div>
                      <span className="text-[10px] text-red-400/60">{conn.flagged_reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {alert.anomalies?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Behavioral Anomalies</h4>
                  {alert.anomalies.map((anomaly, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2 mb-1">
                      <SeverityBadge severity={anomaly.severity} />
                      <span className="text-[11px] text-white/60">{anomaly.description}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-white/20 text-right">
                Processed in {alert.processing_time_ms?.toFixed(0)}ms
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 text-center">
        <span className="text-[9px] text-white/20">{expanded ? "Click to collapse" : "Click for details"}</span>
      </div>
    </motion.div>
  );
}

export default function FraudAlertCard({ alerts, loading }: FraudAlertCardProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <h2 className="text-sm font-semibold text-white">Fraud Alerts</h2>
        </div>
        <span className="text-[11px] font-bold text-red-400/60">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-white/30">
            <span className="text-xs">No fraud alerts yet</span>
            <span className="text-[10px]">All clear — monitoring for threats</span>
          </div>
        ) : (
          <AnimatePresence>
            {alerts.map((alert) => (
              <AlertItem key={alert.transaction_id} alert={alert} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

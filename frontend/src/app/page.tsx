"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import TransactionFeed from "@/components/TransactionFeed";
import CommandInsights from "@/components/CommandInsights";
import GraphView from "@/components/GraphView";
import ThreatMap from "@/components/ThreatMap";
import ScenarioPanel from "@/components/ScenarioPanel";
import type {
  Transaction,
  FraudAlert,
  FraudAnalysisResult,
  GraphNode,
  GraphEdge,
  GeoPoint,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Toast notification type ──
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  exiting?: boolean;
}

// ── ThreatMap event type ──
interface ThreatEvent {
  id: string;
  origin: GeoPoint;
  previous?: GeoPoint;
  riskScore: number;
  isFraud: boolean;
  timestamp: number;
}

export default function Dashboard() {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Quick Actions state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [laserKey, setLaserKey] = useState(0);
  const toastIdRef = useRef(0);

  // Geo-threat events
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);

  // Live telemetry
  const [latency, setLatency] = useState<number | null>(null);
  const [activeNodes, setActiveNodes] = useState(0);
  const [systemVersion, setSystemVersion] = useState("—");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Polling ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to track entities actually generated in this simulation session
  const seenUsersRef = useRef<Set<string>>(new Set());
  const seenTxRef = useRef<Set<string>>(new Set());

  // ── Toast Helpers ──
  const pushToast = useCallback(
    (message: string, type: "success" | "error" | "info") => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      // Auto-remove after 4s
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
      }, 4000);
    },
    []
  );

  // ── Health check with latency measurement ──
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const start = performance.now();
        const res = await fetch(`${API_BASE}/health`);
        const elapsed = Math.round(performance.now() - start);
        if (res.ok) {
          setIsConnected(true);
          setLatency(elapsed);
          const data = await res.json();
          setActiveNodes(data.active_nodes ?? 0);
          setSystemVersion(data.version ?? "—");
        } else {
          setIsConnected(false);
        }
      } catch {
        setIsConnected(false);
        setLatency(null);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Process analysis result ──
  const processResult = useCallback((result: FraudAnalysisResult) => {
    seenUsersRef.current.add(result.user_id);
    seenTxRef.current.add(result.transaction_id);

    const tx: Transaction = {
      transaction_id: result.transaction_id,
      user_id: result.user_id,
      amount: result.amount,
      ip_address: "",
      device_id: "",
      timestamp: result.timestamp,
      merchant: "",
      currency: "USD",
      status: result.is_fraud ? "flagged" : "cleared",
      risk_score: result.risk_score,
    };

    setTransactions((prev) => [tx, ...prev].slice(0, 100));

    if (result.risk_score >= 0.2) {
      const alert: FraudAlert = {
        transaction_id: result.transaction_id,
        user_id: result.user_id,
        amount: result.amount,
        timestamp: result.timestamp,
        risk_score: result.risk_score,
        risk_level: result.risk_level,
        is_fraud: result.is_fraud,
        explanation: result.explanation,
        graph_risk_score: result.graph_report.graph_risk_score,
        is_in_fraud_ring: result.graph_report.is_in_fraud_ring,
        shared_device_count: result.graph_report.shared_device_count,
        shared_ip_count: result.graph_report.shared_ip_count,
        cluster_size: result.graph_report.cluster_size,
        flagged_connections: result.graph_report.flagged_connections,
        behavioral_risk_score: result.behavioral_report.behavioral_risk_score,
        anomalies: result.behavioral_report.anomalies,
        subgraph_nodes: result.graph_report.subgraph_nodes,
        subgraph_edges: result.graph_report.subgraph_edges,
        processing_time_ms: result.processing_time_ms,
        ml_risk_score: result.ml_risk_score,
        ml_feature_significance: result.ml_feature_significance,
        risk_factors: result.risk_factors || [],
        geo_origin: result.geo_origin,
        geo_previous: result.geo_previous,
        scenario_tag: result.scenario_tag,
        created_at: result.analyzed_at,
      };
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    }

    // Create ThreatMap event if geo data available
    if (result.geo_origin) {
      const threatEvent: ThreatEvent = {
        id: result.transaction_id,
        origin: result.geo_origin,
        previous: result.geo_previous || undefined,
        riskScore: result.risk_score,
        isFraud: result.is_fraud,
        timestamp: Date.now(),
      };
      setThreatEvents((prev) => [...prev, threatEvent].slice(-100));
    }

    if (result.graph_report?.subgraph_nodes?.length > 0) {
      setGraphNodes((prev) => {
        const nodesMap = new Map(prev.map((n) => [n.id, n]));
        result.graph_report.subgraph_nodes.forEach((n) => {
          if (n.type === "user" && !seenUsersRef.current.has(n.id)) return;
          if (n.type === "transaction" && !seenTxRef.current.has(n.id)) return;
          if (
            !nodesMap.has(n.id) ||
            (!nodesMap.get(n.id)!.flagged && n.flagged)
          ) {
            nodesMap.set(n.id, n);
          }
        });
        return Array.from(nodesMap.values());
      });

      setGraphEdges((prev) => {
        const edgesMap = new Set(prev.map((e) => `${e.source}-${e.target}`));
        const newEdges = [...prev];
        result.graph_report.subgraph_edges.forEach((e) => {
          const key = `${e.source}-${e.target}`;
          if (!edgesMap.has(key)) {
            edgesMap.add(key);
            newEdges.push(e);
          }
        });
        return newEdges;
      });
    }
  }, []);

  // ── Poll single transaction ──
  const pollTransaction = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/simulate/single`, {
        method: "POST",
      });
      if (res.ok) {
        const result: FraudAnalysisResult = await res.json();
        processResult(result);
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [processResult]);

  // ── Simulation controls ──
  const startSimulation = useCallback(async () => {
    setSimulationActive(true);
    setLoading(true);
    setLaserKey((k) => k + 1);
    pollingRef.current = setInterval(pollTransaction, 2000);
    await pollTransaction();
    setLoading(false);
  }, [pollTransaction]);

  const stopSimulation = useCallback(() => {
    setSimulationActive(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Quick Action handler ──
  const executeAction = useCallback(
    async (
      actionKey: string,
      endpoint: string,
      label: string
    ) => {
      if (actionLoading) return; // debounce
      setActionLoading(actionKey);
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          pushToast(`✓ ${data.message}`, "success");
        } else {
          pushToast(`✗ ${label} failed — server returned ${res.status}`, "error");
        }
      } catch {
        pushToast(`✗ ${label} failed — connection error`, "error");
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading, pushToast]
  );

  // ── Computed stats ──
  const totalTransactions = transactions.length;
  const flaggedCount = alerts.filter((a) => a.is_fraud).length;
  const avgRiskScore =
    transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.risk_score || 0), 0) /
        transactions.length
      : 0;
  const fraudRate =
    totalTransactions > 0 ? flaggedCount / totalTransactions : 0;

  // ── Process scenario results ──
  const handleScenarioResults = useCallback(
    (results: unknown[]) => {
      setLaserKey((k) => k + 1); // Trigger laser scan
      for (const r of results) {
        processResult(r as FraudAnalysisResult);
      }
    },
    [processResult]
  );

  return (
    <div className="w-full relative">
      <Header
        isConnected={isConnected}
        simulationActive={simulationActive}
        onStartSimulation={startSimulation}
        onStopSimulation={stopSimulation}
      />

      <main key={laserKey} className={`p-6 bg-amoled ${simulationActive ? 'laser-active' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <StatsBar
            totalTransactions={totalTransactions}
            flaggedCount={flaggedCount}
            avgRiskScore={avgRiskScore}
            fraudRate={fraudRate}
          />
        </motion.div>

        {/* Dashboard Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <section className="lg:col-span-1 space-y-6">
            <CommandInsights alerts={alerts} isConnected={isConnected} />
          </section>

          <section className="lg:col-span-3">
            <TransactionFeed transactions={transactions} loading={loading} />
          </section>
        </motion.div>

        {/* Threat Map + Scenario Panel */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        >
          <div className="md:col-span-2 min-h-[300px]">
            <ThreatMap events={threatEvents} />
          </div>
          <div>
            <ScenarioPanel onScenarioResults={handleScenarioResults} />
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          <div className="md:col-span-2 min-h-[300px]">
            <GraphView 
              nodes={graphNodes} 
              edges={graphEdges} 
              onNodeClick={setSelectedEntityId}
            />
          </div>

          {/* ── Quick Actions Panel ── */}
          <div className="glass-card rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {/* System Reset */}
                <button
                  onClick={() =>
                    executeAction(
                      "reset",
                      "/actions/system-reset",
                      "System Reset"
                    )
                  }
                  disabled={!!actionLoading}
                  className="action-btn w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-between group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                    SYSTEM_RESET
                  </span>
                  {actionLoading === "reset" ? (
                    <span className="action-spinner" />
                  ) : (
                    <span className="material-symbols-outlined text-sm text-gray-500 group-hover:text-emerald-400 transition-colors">
                      arrow_forward
                    </span>
                  )}
                </button>

                {/* Rotate Keys */}
                <button
                  onClick={() =>
                    executeAction(
                      "rotate",
                      "/actions/rotate-keys",
                      "Rotate Keys"
                    )
                  }
                  disabled={!!actionLoading}
                  className="action-btn w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-between group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                    ROTATE_API_KEYS
                  </span>
                  {actionLoading === "rotate" ? (
                    <span className="action-spinner" />
                  ) : (
                    <span className="material-symbols-outlined text-sm text-gray-500 group-hover:text-emerald-400 transition-colors">
                      arrow_forward
                    </span>
                  )}
                </button>

                {/* Emergency Lockout */}
                <button
                  onClick={() =>
                    executeAction(
                      "lockout",
                      "/actions/emergency-lockout",
                      "Emergency Lockout"
                    )
                  }
                  disabled={!!actionLoading}
                  className="action-btn-danger w-full text-left px-4 py-3 border border-red-900/50 bg-red-950/10 rounded-lg flex items-center justify-between group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-bold text-red-500">
                    EMERGENCY_LOCKOUT
                  </span>
                  {actionLoading === "lockout" ? (
                    <span className="action-spinner" />
                  ) : (
                    <span className="material-symbols-outlined text-sm text-red-500">
                      priority_high
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Live Status Bar */}
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
              <div
                className={`w-2 h-2 ${
                  isConnected
                    ? "bg-emerald-400 animate-ping"
                    : "bg-red-500"
                } rounded-full`}
              />
              <span className="text-[10px] font-mono text-gray-500 tracking-tighter">
                LATENCY: {latency !== null ? `${latency}MS` : "—"} // NODES:{" "}
                {activeNodes} // {systemVersion}
              </span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── Toast Notifications ── */}
      <div className="fixed bottom-6 right-6 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto px-4 py-3 rounded-lg text-xs font-mono border backdrop-blur-md shadow-lg max-w-sm ${
                toast.type === "success"
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/30"
                  : toast.type === "error"
                  ? "bg-red-950/80 text-red-300 border-red-500/30"
                  : "bg-white/5 text-gray-300 border-white/10"
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* ── Entity Intelligence Sidebar ── */}
      <AnimatePresence>
        {selectedEntityId && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[400px] bg-black/95 backdrop-blur-2xl border-l border-white/10 z-[100] p-6 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Entity Intelligence
                </h2>
              </div>
              <button 
                onClick={() => setSelectedEntityId(null)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors group"
              >
                <span className="material-symbols-outlined text-gray-500 group-hover:text-white transition-colors">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar transition-all">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Resource Identifier</span>
                <p className="text-sm font-mono text-white break-all leading-relaxed">{selectedEntityId}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                  <span className="h-px flex-1 bg-white/5"></span>
                  Security Posture
                  <span className="h-px flex-1 bg-white/5"></span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">Reputation</span>
                    <span className="text-xs font-black text-red-500 glow-red">FLAGGED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">Confidence</span>
                    <span className="text-xs font-black text-emerald-400">94.2%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                  <span className="h-px flex-1 bg-white/5"></span>
                  Behavioral Fingerprint
                  <span className="h-px flex-1 bg-white/5"></span>
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "IP Velocity", val: "High (4/min)", color: "text-amber-400" },
                    { label: "Device Trust", val: "Critical Fail", color: "text-red-500" },
                    { label: "Impossible Travel", val: "Detected", color: "text-red-500" },
                    { label: "User Age", val: "14 Days", color: "text-gray-400" },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                      <span className="text-[11px] text-gray-400">{stat.label}</span>
                      <span className={`text-[11px] font-mono font-bold ${stat.color}`}>{stat.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-950/10 border border-red-900/20">
                <h4 className="text-[10px] font-bold text-red-500 uppercase mb-2">Threat Intelligence Note</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                  "Entity associated with known cluster 'Syndicate-Alpha'. Multi-vector anomalies detected across IP and Device chains."
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-white/5">
               <button className="w-full py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
                  TERMINATE_SESSION
               </button>
               <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all">
                  DOWNLOAD_FORENSIC_PML
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

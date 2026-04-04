"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import TransactionFeed from "@/components/TransactionFeed";
import FraudAlertCard from "@/components/FraudAlertCard";
import GraphView from "@/components/GraphView";
import type { Transaction, FraudAlert, FraudAnalysisResult, GraphNode, GraphEdge } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Polling ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) setIsConnected(true);
        else setIsConnected(false);
      } catch {
        setIsConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Process analysis result
  const processResult = useCallback((result: FraudAnalysisResult) => {
    // Add to transactions
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

    // Add to alerts if flagged
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
        created_at: result.analyzed_at,
      };

      setAlerts((prev) => [alert, ...prev].slice(0, 50));

      // Update graph with latest subgraph data
      if (result.graph_report.subgraph_nodes.length > 0) {
        setGraphNodes(result.graph_report.subgraph_nodes);
        setGraphEdges(result.graph_report.subgraph_edges);
      }
    }
  }, []);

  // Poll for single transactions in simulation mode
  const pollTransaction = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/simulate/single`, { method: "POST" });
      if (res.ok) {
        const result: FraudAnalysisResult = await res.json();
        processResult(result);
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [processResult]);

  // Start simulation (client-side polling)
  const startSimulation = useCallback(async () => {
    setSimulationActive(true);
    setLoading(true);

    // Start polling every 2 seconds
    pollingRef.current = setInterval(pollTransaction, 2000);

    // First transaction immediately
    await pollTransaction();
    setLoading(false);
  }, [pollTransaction]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    setSimulationActive(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Computed stats
  const totalTransactions = transactions.length;
  const flaggedCount = alerts.filter((a) => a.is_fraud).length;
  const avgRiskScore =
    transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.risk_score || 0), 0) / transactions.length
      : 0;
  const fraudRate = totalTransactions > 0 ? flaggedCount / totalTransactions : 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#06060a]">
      <Header
        isConnected={isConnected}
        simulationActive={simulationActive}
        onStartSimulation={startSimulation}
        onStopSimulation={stopSimulation}
      />

      <main className="relative z-10 flex-1 p-4 lg:p-6">
        <div className="mx-auto max-w-[1920px] space-y-4">
          {/* Stats Bar */}
          <StatsBar
            totalTransactions={totalTransactions}
            flaggedCount={flaggedCount}
            avgRiskScore={avgRiskScore}
            fraudRate={fraudRate}
          />

          {/* Main Grid */}
          <div className="grid gap-4 lg:grid-cols-12" style={{ height: "calc(100vh - 220px)" }}>
            {/* Left — Transaction Feed */}
            <div className="lg:col-span-4 overflow-hidden">
              <TransactionFeed transactions={transactions} loading={loading} />
            </div>

            {/* Center — Graph View */}
            <div className="lg:col-span-4 overflow-hidden">
              <GraphView nodes={graphNodes} edges={graphEdges} />
            </div>

            {/* Right — Fraud Alerts */}
            <div className="lg:col-span-4 overflow-hidden">
              <FraudAlertCard alerts={alerts} loading={loading} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

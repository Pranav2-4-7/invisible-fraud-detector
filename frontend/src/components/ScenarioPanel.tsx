"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { Scenario } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ScenarioPanelProps {
  onScenarioResults: (results: unknown[]) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-red-500/40 bg-red-500/10 hover:bg-red-500/20",
  HIGH: "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15",
  MEDIUM: "border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15",
};

export default function ScenarioPanel({ onScenarioResults }: ScenarioPanelProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const res = await fetch(`${API_BASE}/scenarios`, {
          headers: {
            'Accept': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setScenarios(data.scenarios || []);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn("Could not load scenarios from backend, using fallback:", err);
        // Fallback built-in scenarios
        setScenarios([
          { id: "botnet_strike", name: "Botnet Strike", description: "Coordinated bot attack via shared devices.", icon: "🤖", severity: "CRITICAL", tx_count: 5 },
          { id: "impossible_travel", name: "Impossible Travel", description: "NYC → Moscow in 3 minutes.", icon: "✈️", severity: "CRITICAL", tx_count: 3 },
          { id: "money_laundering", name: "Money Laundering", description: "Structured deposits under $10K.", icon: "💰", severity: "HIGH", tx_count: 4 },
          { id: "identity_theft", name: "Identity Theft", description: "Stolen credentials from new locations.", icon: "🎭", severity: "HIGH", tx_count: 3 },
          { id: "rapid_cashout", name: "Rapid Cash-Out", description: "High-velocity account drain.", icon: "⚡", severity: "CRITICAL", tx_count: 6 },
          { id: "financial_anvil", name: "Financial Anvil", description: "Stress test high-value audit flow.", icon: "⚒️", severity: "HIGH", tx_count: 13 },
        ]);
      }
    };
    loadScenarios();
  }, []);

  const runScenario = useCallback(
    async (scenarioId: string) => {
      if (runningScenario) return;
      setRunningScenario(scenarioId);
      try {
        const res = await fetch(`${API_BASE}/simulate/scenario/${scenarioId}`, {
          method: "POST",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          onScenarioResults(data.results || []);
        } else {
          console.error(`Scenario ${scenarioId} failed with status ${res.status}`);
        }
      } catch (err) {
        console.error("Scenario request failed:", err);
        // Silently fail - backend might not be running
      } finally {
        setRunningScenario(null);
      }
    },
    [runningScenario, onScenarioResults]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card rounded-lg p-5"
    >
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">
        Attack Scenarios
      </h3>
      <p className="text-[10px] text-gray-600 mb-4 font-mono">
        Deploy pre-built fraud patterns to test detection capabilities
      </p>
      <div className="space-y-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => runScenario(scenario.id)}
            disabled={!!runningScenario}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group ${SEVERITY_COLORS[scenario.severity] || SEVERITY_COLORS.MEDIUM
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{scenario.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-white/90">
                    {scenario.name}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {scenario.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-gray-600">
                  {scenario.tx_count} TXN
                </span>
                {runningScenario === scenario.id ? (
                  <span className="action-spinner" />
                ) : (
                  <span className="material-symbols-outlined text-sm text-gray-500 group-hover:text-white transition-colors">
                    play_arrow
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

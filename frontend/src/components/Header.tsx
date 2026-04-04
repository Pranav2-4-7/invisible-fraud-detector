"use client";

import { motion } from "framer-motion";

interface HeaderProps {
  isConnected: boolean;
  simulationActive: boolean;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
}

export default function Header({
  isConnected,
  simulationActive,
  onStartSimulation,
  onStopSimulation,
}: HeaderProps) {
  return (
    <header className="relative z-10 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </motion.div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">
              Invisible Fraud Detector
            </h1>
            <p className="text-[11px] font-medium text-white/40 tracking-wider uppercase">
              Real-Time Command Center
            </p>
          </div>
        </div>

        {/* Center — Status */}
        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isConnected ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
            <span className="text-xs font-medium text-white/50">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          {/* Simulation Status */}
          {simulationActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 border border-amber-500/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span className="text-xs font-semibold text-amber-400">
                Simulation Running
              </span>
            </motion.div>
          )}
        </div>

        {/* Right — Controls */}
        <div className="flex items-center gap-3">
          {!simulationActive ? (
            <motion.button
              onClick={onStartSimulation}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Simulation
            </motion.button>
          ) : (
            <motion.button
              onClick={onStopSimulation}
              className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 border border-red-500/30 transition-all hover:bg-red-500/30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}

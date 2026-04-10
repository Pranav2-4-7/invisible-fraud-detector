"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
  // Live clock for that "ops center" feel
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().slice(11, 19) + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex justify-between items-center px-6 py-3 w-full sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10 font-['Inter'] antialiased tracking-tight">
      <div className="flex items-center gap-6">
        {/* Gradient title with heartbeat indicator */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <span
              className={`block w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-green-400 heartbeat" : "bg-red-500"
              }`}
            />
            {isConnected && (
              <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-30" />
            )}
          </div>
          <span
            className="text-lg font-black tracking-tighter uppercase"
            style={{
              background: "linear-gradient(135deg, #00FFAA, #00D4FF, #A855F7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FRAUD_SHIELD_OS
          </span>
        </div>

        <div className="relative hidden md:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-sm">
            search
          </span>
          <input
            className="bg-white/5 border border-transparent text-xs rounded-full pl-10 pr-4 py-1.5 w-64 focus:border-emerald-500/30 focus:outline-none text-gray-300 transition-colors placeholder:text-gray-600"
            placeholder="INVESTIGATE_ENTITY..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live Clock */}
        <span className="hidden lg:block text-[10px] font-mono text-gray-500 tracking-wider">
          {time}
        </span>

        {/* Simulation Status */}
        {simulationActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden md:flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 border border-amber-500/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Simulation Active
            </span>
          </motion.div>
        )}

        <div className="flex gap-2">
          {!simulationActive ? (
            <button
              onClick={onStartSimulation}
              className="px-4 py-1.5 text-[10px] font-bold rounded border uppercase tracking-widest transition-all duration-200 bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_16px_rgba(0,255,170,0.1)] active:scale-95"
            >
              Start
            </button>
          ) : (
            <button
              onClick={onStopSimulation}
              className="px-4 py-1.5 text-[10px] font-bold rounded border uppercase tracking-widest transition-all duration-200 bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_16px_rgba(255,60,60,0.1)] active:scale-95"
            >
              Stop
            </button>
          )}
        </div>

        <div className="flex gap-1">
          <div className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all duration-200 cursor-pointer active:scale-90">
            <span className="material-symbols-outlined text-[20px]">
              notifications_active
            </span>
          </div>
          <div
            className={`p-2 transition-all duration-200 cursor-pointer active:scale-90 rounded-lg ${
              isConnected
                ? "text-emerald-400 hover:bg-emerald-500/10"
                : "text-gray-400 hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              sensors
            </span>
          </div>
          <div className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/5 rounded-lg transition-all duration-200 cursor-pointer active:scale-90">
            <span className="material-symbols-outlined text-[20px]">
              account_tree
            </span>
          </div>
        </div>

        <div className="h-8 w-8 rounded-full bg-surface-container-highest border border-white/10 overflow-hidden shrink-0 ring-2 ring-transparent hover:ring-emerald-500/30 transition-all duration-200">
          <img
            alt="Analyst Profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3dI-Y5QxKiWrgtgfZs3Ej27MAR8sy8-duWM9VJtVTkQzeQ01XxJnTUuqqq_OjW6h-F-zJcHRofmfLdfhjXmrWcI0kSqNx5-nIyvBViqzD36_dOTCnR6Kowb8mVDXuF_nibpmRIiPy0sz8U3xqranuyMcfOfx6CCCGgGI5-x2zJ9mUOJipYOCiHby8VGrk3zUrh68widekUjuuYNfLpaRfxs5XVfE1ydLRBoL6hTEJyFlBVp6P8QNv13Z0BX6ftJNbN0UqH3eh1dQ"
          />
        </div>
      </div>
    </header>
  );
}

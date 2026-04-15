"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface StatsBarProps {
  totalTransactions: number;
  flaggedCount: number;
  avgRiskScore: number;
  fraudRate: number;
}

function AnimatedCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = end;
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}</span>;
}

export default function StatsBar({ totalTransactions, flaggedCount, avgRiskScore, fraudRate }: StatsBarProps) {
  const [pps, setPps] = useState(142);
  const [integrity, setIntegrity] = useState(99.85);

  useEffect(() => {
    const interval = setInterval(() => {
      setPps(prev => Math.max(120, Math.min(180, prev + (Math.random() - 0.5) * 10)));
      setIntegrity(prev => Math.max(99.7, Math.min(99.9, prev + (Math.random() - 0.5) * 0.05)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Total Transactions", value: totalTransactions, color: "from-cyan-500 to-blue-500" },
    { label: "Flagged as Fraud", value: flaggedCount, color: "from-red-500 to-pink-500" },
    { label: "Avg Risk Score", value: avgRiskScore * 100, suffix: "%", color: "from-amber-500 to-orange-500" },
    { label: "Fraud Rate", value: fraudRate * 100, suffix: "%", color: "from-purple-500 to-violet-500" },
    { label: "Scanning PPS", value: pps, suffix: " PKTS", color: "from-emerald-500 to-teal-500" },
    { label: "System Integrity", value: integrity, suffix: "%", color: "from-blue-500 to-indigo-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
        >
          <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${stat.color} opacity-[0.07] blur-xl transition-opacity group-hover:opacity-[0.15]`} />
          <div className="relative">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">{stat.label}</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.suffix === "%" ? 1 : 0} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

interface RiskGaugeProps {
  score: number;
  size?: number;
}

export default function RiskGauge({ score, size = 56 }: RiskGaugeProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score);

  const getColor = () => {
    if (score >= 0.7) return { stroke: "#FF3D57", glow: "rgba(255,61,87,0.3)", text: "text-red-400" };
    if (score >= 0.4) return { stroke: "#FF8C00", glow: "rgba(255,140,0,0.3)", text: "text-orange-400" };
    if (score >= 0.2) return { stroke: "#FFB800", glow: "rgba(255,184,0,0.3)", text: "text-amber-400" };
    return { stroke: "#00D4FF", glow: "rgba(0,212,255,0.2)", text: "text-cyan-400" };
  };

  const color = getColor();

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth="3" stroke="rgba(255,255,255,0.06)" fill="none" />
      </svg>
      <svg width={size} height={size} className="absolute -rotate-90" style={{ filter: `drop-shadow(0 0 4px ${color.glow})` }}>
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth="3" stroke={color.stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className={`text-[10px] font-bold ${color.text}`}>{Math.round(score * 100)}</span>
    </div>
  );
}

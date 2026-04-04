"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface RenderedNode {
  id: string; x: number; y: number; vx: number; vy: number;
  type: string; flagged: boolean; label: string;
}

const NODE_COLORS: Record<string, string> = {
  user: "#00D4FF", device: "#A855F7", ip: "#FFB800", transaction: "#34D399",
};

export default function GraphView({ nodes, edges }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const renderedNodes = useRef<RenderedNode[]>([]);

  const initializeNodes = useCallback(() => {
    if (!canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    renderedNodes.current = nodes.map((n) => ({
      id: n.id,
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0, vy: 0,
      type: n.type || "unknown",
      flagged: !!n.flagged,
      label: n.id.length > 12 ? n.id.slice(0, 12) + "…" : n.id,
    }));
  }, [nodes]);

  const simulate = useCallback(() => {
    const rn = renderedNodes.current;
    if (!canvasRef.current || rn.length === 0) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const k = 80;

    for (let i = 0; i < rn.length; i++) {
      for (let j = i + 1; j < rn.length; j++) {
        const dx = rn[j].x - rn[i].x;
        const dy = rn[j].y - rn[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (k * k) / dist * 0.05;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        rn[i].vx -= fx; rn[i].vy -= fy;
        rn[j].vx += fx; rn[j].vy += fy;
      }
    }

    for (const edge of edges) {
      const s = rn.find((n) => n.id === edge.source);
      const t = rn.find((n) => n.id === edge.target);
      if (!s || !t) continue;
      const dx = t.x - s.x; const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (dist - k) * 0.01;
      const fx = (dx / dist) * f; const fy = (dy / dist) * f;
      s.vx += fx; s.vy += fy; t.vx -= fx; t.vy -= fy;
    }

    for (const node of rn) {
      node.vx += (w / 2 - node.x) * 0.01;
      node.vy += (h / 2 - node.y) * 0.01;
      node.vx *= 0.85; node.vy *= 0.85;
      node.x += node.vx; node.y += node.vy;
      node.x = Math.max(30, Math.min(w - 30, node.x));
      node.y = Math.max(30, Math.min(h - 30, node.y));
    }
  }, [edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width; const h = canvas.height;
    const rn = renderedNodes.current;
    ctx.clearRect(0, 0, w, h);

    for (const edge of edges) {
      const s = rn.find((n) => n.id === edge.source);
      const t = rn.find((n) => n.id === edge.target);
      if (!s || !t) continue;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.stroke();
    }

    for (const node of rn) {
      const color = node.flagged ? "#FF3D57" : (NODE_COLORS[node.type] || "#888");
      const r = node.type === "transaction" ? 4 : node.flagged ? 8 : 6;
      if (node.flagged) {
        ctx.beginPath(); ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 6);
        grad.addColorStop(0, "rgba(255,61,87,0.3)"); grad.addColorStop(1, "rgba(255,61,87,0)");
        ctx.fillStyle = grad; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      if (r > 4) {
        ctx.font = "9px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + r + 12);
      }
    }
    simulate();
    animRef.current = requestAnimationFrame(draw);
  }, [edges, simulate]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const parent = canvasRef.current.parentElement;
    if (parent) {
      canvasRef.current.width = parent.clientWidth;
      canvasRef.current.height = parent.clientHeight;
    }
    initializeNodes();
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges, initializeNodes, draw]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex h-full flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          <h2 className="text-sm font-semibold text-white">Network Graph</h2>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-white/30 capitalize">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-[9px] text-white/30">flagged</span>
          </div>
        </div>
      </div>
      <div className="relative flex-1">
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30 z-10">
            <span className="text-xs">Graph visualization will appear here</span>
            <span className="text-[10px]">Analyze transactions to build the network</span>
          </div>
        )}
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </motion.div>
  );
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface RenderedNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string;
  flagged: boolean;
  label: string;
}

const NODE_COLORS: Record<string, string> = {
  user: "#00D4FF",
  device: "#A855F7",
  ip: "#FFB800",
  transaction: "#00FFAA",
};

// ── SVG icon drawing functions ──
function drawUserIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  // Head (circle)
  ctx.beginPath();
  ctx.arc(x, y - size * 0.3, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Body (arc)
  ctx.beginPath();
  ctx.arc(x, y + size * 0.7, size * 0.55, Math.PI, 0, false);
  ctx.fill();
  ctx.restore();
}

function drawDeviceIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = color;
  const w = size * 0.9;
  const h = size * 0.7;
  // Monitor rect
  ctx.strokeRect(x - w / 2, y - h / 2 - size * 0.15, w, h);
  // Stand
  ctx.beginPath();
  ctx.moveTo(x - size * 0.2, y + h / 2 - size * 0.15);
  ctx.lineTo(x + size * 0.2, y + h / 2 - size * 0.15);
  ctx.lineTo(x + size * 0.3, y + h / 2 + size * 0.1);
  ctx.lineTo(x - size * 0.3, y + h / 2 + size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIPIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const r = size * 0.5;
  // Globe circle
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Horizontal ellipse
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Vertical line
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();
  ctx.restore();
}

function drawTransactionIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.5);
  ctx.lineTo(x + size * 0.4, y);
  ctx.lineTo(x, y + size * 0.5);
  ctx.lineTo(x - size * 0.4, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const ICON_DRAWERS: Record<
  string,
  (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ) => void
> = {
  user: drawUserIcon,
  device: drawDeviceIcon,
  ip: drawIPIcon,
  transaction: drawTransactionIcon,
};

export default function GraphView({ nodes, edges }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const renderedNodes = useRef<RenderedNode[]>([]);

  const initializeNodes = useCallback(() => {
    if (!canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;

    // Preserve positions for existing nodes
    const existing = new Map(
      renderedNodes.current.map((n) => [n.id, n])
    );

    renderedNodes.current = nodes.map((n) => {
      const prev = existing.get(n.id);
      return {
        id: n.id,
        x: prev?.x ?? w / 2 + (Math.random() - 0.5) * w * 0.5,
        y: prev?.y ?? h / 2 + (Math.random() - 0.5) * h * 0.5,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        type: n.type || "unknown",
        flagged: !!n.flagged,
        label: n.id.length > 12 ? n.id.slice(0, 12) + "…" : n.id,
      };
    });
  }, [nodes]);

  const simulate = useCallback(() => {
    const rn = renderedNodes.current;
    if (!canvasRef.current || rn.length === 0) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const k = 90; // Ideal distance

    // Repulsion between all nodes
    for (let i = 0; i < rn.length; i++) {
      for (let j = i + 1; j < rn.length; j++) {
        const dx = rn[j].x - rn[i].x;
        const dy = rn[j].y - rn[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = ((k * k) / dist) * 0.04;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        rn[i].vx -= fx;
        rn[i].vy -= fy;
        rn[j].vx += fx;
        rn[j].vy += fy;
      }
    }

    // Edge spring attraction
    for (const edge of edges) {
      const s = rn.find((n) => n.id === edge.source);
      const t = rn.find((n) => n.id === edge.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (dist - k) * 0.008;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Center gravity + damping
    for (const node of rn) {
      node.vx += (w / 2 - node.x) * 0.008;
      node.vy += (h / 2 - node.y) * 0.008;
      node.vx *= 0.88;
      node.vy *= 0.88;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(40, Math.min(w - 40, node.x));
      node.y = Math.max(40, Math.min(h - 40, node.y));
    }
  }, [edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const rn = renderedNodes.current;
    ctx.clearRect(0, 0, w, h);

    // Draw edges with gradient
    for (const edge of edges) {
      const s = rn.find((n) => n.id === edge.source);
      const t = rn.find((n) => n.id === edge.target);
      if (!s || !t) continue;

      const isFlagged = s.flagged || t.flagged;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = isFlagged
        ? "rgba(255, 60, 60, 0.15)"
        : "rgba(0, 255, 170, 0.08)";
      ctx.lineWidth = isFlagged ? 1.5 : 0.8;
      ctx.stroke();
    }

    // Draw nodes with SVG icons
    for (const node of rn) {
      const color = node.flagged
        ? "#FF3D57"
        : NODE_COLORS[node.type] || "#888";
      const iconSize = node.type === "transaction" ? 8 : node.flagged ? 14 : 11;

      // Flagged glow
      if (node.flagged) {
        const grad = ctx.createRadialGradient(
          node.x,
          node.y,
          2,
          node.x,
          node.y,
          iconSize + 10
        );
        grad.addColorStop(0, "rgba(255,61,87,0.25)");
        grad.addColorStop(1, "rgba(255,61,87,0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, iconSize + 10, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw entity-specific icon
      const drawer = ICON_DRAWERS[node.type];
      if (drawer) {
        drawer(ctx, node.x, node.y, iconSize, color);
      } else {
        // Fallback circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, iconSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Label
      if (iconSize > 6) {
        ctx.font = "9px Inter, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + iconSize + 14);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card rounded-lg p-5 flex flex-col h-full border border-white/10 relative"
    >
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">
        Neural Network Topology
      </h3>
      <div className="absolute top-5 right-5 flex items-center gap-3 z-10">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[9px] text-gray-500 uppercase font-mono">
              {type}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] text-gray-500 uppercase font-mono">
            Flagged
          </span>
        </div>
      </div>
      <div className="relative flex-1">
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-[10px] font-mono text-gray-400 bg-black/80 px-3 py-1.5 border border-white/10 rounded">
              AWAITING_GRAPH_DATA...
            </span>
          </div>
        )}
        {nodes.length > 0 && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="text-[10px] font-mono text-emerald-500/60 bg-black/80 px-2 py-1 border border-emerald-500/10 rounded">
              ● LIVE — {nodes.length} ENTITIES
            </span>
          </div>
        )}
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </motion.div>
  );
}

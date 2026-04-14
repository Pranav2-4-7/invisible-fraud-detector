"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GeoPoint } from "@/lib/types";

interface ThreatEvent {
  id: string;
  origin: GeoPoint;
  previous?: GeoPoint;
  riskScore: number;
  isFraud: boolean;
  timestamp: number;
}

interface ThreatMapProps {
  events: ThreatEvent[];
}

// Simple Mercator projection: lat/lon → x/y on a 800×400 canvas
function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * 800;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 200 - (mercN / Math.PI) * 200;
  return [x, Math.max(10, Math.min(390, y))];
}

// Simplified world map paths (continents outline)
const WORLD_PATHS = [
  // North America
  "M120,80 L140,60 L180,55 L210,65 L230,80 L240,100 L230,130 L210,150 L190,160 L170,170 L150,165 L130,150 L115,130 L110,110 Z",
  // South America
  "M170,180 L190,175 L210,190 L220,210 L225,240 L220,270 L210,300 L195,320 L180,310 L170,280 L165,250 L160,220 L165,200 Z",
  // Europe
  "M370,60 L380,50 L400,48 L420,52 L430,60 L440,80 L435,95 L420,100 L400,95 L385,90 L375,80 Z",
  // Africa
  "M370,120 L385,110 L410,105 L430,110 L445,130 L450,160 L445,200 L435,230 L420,250 L400,260 L385,250 L375,230 L370,200 L365,170 L365,140 Z",
  // Asia
  "M440,45 L480,35 L530,30 L580,35 L620,45 L650,65 L660,85 L650,110 L620,120 L590,125 L560,120 L530,110 L500,100 L470,90 L450,80 L440,65 Z",
  // Australia
  "M600,220 L630,215 L660,220 L680,235 L675,255 L660,265 L635,270 L615,260 L605,245 L600,230 Z",
];

export default function ThreatMap({ events }: ThreatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const eventsRef = useRef<ThreatEvent[]>([]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const now = Date.now();

    ctx.clearRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = "rgba(0, 255, 170, 0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    // Draw continent outlines via Path2D
    ctx.strokeStyle = "rgba(0, 255, 170, 0.12)";
    ctx.fillStyle = "rgba(0, 255, 170, 0.03)";
    ctx.lineWidth = 1;
    for (const pathStr of WORLD_PATHS) {
      const path = new Path2D(pathStr);
      ctx.fill(path);
      ctx.stroke(path);
    }

    // Draw events
    const activeEvents = eventsRef.current.filter(
      (e) => now - e.timestamp < 15000
    );

    for (const event of activeEvents) {
      const age = (now - event.timestamp) / 1000; // seconds
      const fade = Math.max(0, 1 - age / 15);
      const [ox, oy] = project(event.origin.lat, event.origin.lon);

      // Draw travel arc if previous location exists
      if (event.previous) {
        const [px, py] = project(event.previous.lat, event.previous.lon);
        const midX = (ox + px) / 2;
        const midY = Math.min(oy, py) - 30;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(midX, midY, ox, oy);
        ctx.strokeStyle = event.isFraud
          ? `rgba(255, 60, 60, ${0.6 * fade})`
          : `rgba(0, 255, 170, ${0.3 * fade})`;
        ctx.lineWidth = event.isFraud ? 2 : 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated dot along arc
        const t = (age * 0.5) % 1;
        const arcX = (1 - t) * (1 - t) * px + 2 * (1 - t) * t * midX + t * t * ox;
        const arcY = (1 - t) * (1 - t) * py + 2 * (1 - t) * t * midY + t * t * oy;
        ctx.beginPath();
        ctx.arc(arcX, arcY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = event.isFraud
          ? `rgba(255, 60, 60, ${fade})`
          : `rgba(0, 255, 170, ${fade})`;
        ctx.fill();

        // Previous location marker (small)
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 100, 100, ${0.4 * fade})`;
        ctx.fill();
      }

      // Expanding pulse ring
      const pulseRadius = 6 + age * 4;
      const pulseAlpha = Math.max(0, 0.4 - age * 0.03) * fade;
      ctx.beginPath();
      ctx.arc(ox, oy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = event.isFraud
        ? `rgba(255, 60, 60, ${pulseAlpha})`
        : `rgba(0, 255, 170, ${pulseAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Core dot
      const coreSize = event.isFraud ? 4 : 3;
      ctx.beginPath();
      ctx.arc(ox, oy, coreSize, 0, Math.PI * 2);

      // Glow
      const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreSize + 8);
      if (event.isFraud) {
        grad.addColorStop(0, `rgba(255, 60, 60, ${0.8 * fade})`);
        grad.addColorStop(1, `rgba(255, 60, 60, 0)`);
      } else {
        grad.addColorStop(0, `rgba(0, 255, 170, ${0.6 * fade})`);
        grad.addColorStop(1, `rgba(0, 255, 170, 0)`);
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner solid dot
      ctx.beginPath();
      ctx.arc(ox, oy, coreSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = event.isFraud
        ? `rgba(255, 60, 60, ${fade})`
        : `rgba(0, 255, 170, ${fade})`;
      ctx.fill();

      // City label
      if (fade > 0.5) {
        ctx.font = "9px Inter, system-ui, sans-serif";
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * fade})`;
        ctx.textAlign = "center";
        ctx.fillText(event.origin.city, ox, oy + coreSize + 14);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const parent = canvasRef.current.parentElement;
    if (parent) {
      canvasRef.current.width = 800;
      canvasRef.current.height = 400;
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const activeCount = events.filter(
    (e) => Date.now() - e.timestamp < 15000
  ).length;
  const fraudCount = events.filter(
    (e) => e.isFraud && Date.now() - e.timestamp < 15000
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card rounded-lg p-5 flex flex-col h-full border border-white/10 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
          Global Threat Map
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-gray-500 uppercase font-mono">
              Clean
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] text-gray-500 uppercase font-mono">
              Threat
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-[200px]">
        {events.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-[10px] font-mono text-gray-400 bg-black/80 px-3 py-1.5 border border-white/10 rounded">
              AWAITING_GEO_INTEL...
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "auto" }}
        />
      </div>

      {activeCount > 0 && (
        <div className="absolute bottom-4 left-5 z-10">
          <span className="text-[10px] font-mono text-emerald-500/60 bg-black/80 px-2 py-1 border border-emerald-500/10 rounded">
            ● LIVE — {activeCount} EVENTS{" "}
            {fraudCount > 0 && (
              <span className="text-red-400">
                ({fraudCount} THREAT{fraudCount > 1 ? "S" : ""})
              </span>
            )}
          </span>
        </div>
      )}
    </motion.div>
  );
}

"use client";

import { useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type DemoStatus = "idle" | "loading" | "approved" | "blocked" | "error";

interface DemoDetails {
    previous_ip?: string;
    current_ip?: string;
    time_delta_seconds?: number;
    user_id?: string;
    amount?: number;
}

interface DemoResponse {
    status: "APPROVED" | "BLOCKED";
    reason?: string;
    message: string;
    details?: DemoDetails;
}

export default function LiveDemoPanel() {
    const [demoStatus, setDemoStatus] = useState<DemoStatus>("idle");
    const [response, setResponse] = useState<DemoResponse | null>(null);
    const [userId] = useState("demo_user");

    const sendTransaction = useCallback(async () => {
        setDemoStatus("loading");
        setResponse(null);

        try {
            const res = await fetch(`${API_BASE}/demo/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Required to bypass the Ngrok browser-warning intercept page
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify({ user_id: userId, amount: 500 }),
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const data: DemoResponse = await res.json();
            setResponse(data);
            setDemoStatus(data.status === "BLOCKED" ? "blocked" : "approved");

            // Auto-reset to idle after 6 seconds so the demo can be repeated
            setTimeout(() => {
                setDemoStatus("idle");
                setResponse(null);
            }, 6000);
        } catch (err) {
            console.error(err);
            setDemoStatus("error");
            setTimeout(() => setDemoStatus("idle"), 4000);
        }
    }, [userId]);

    const resetSession = useCallback(async () => {
        await fetch(`${API_BASE}/demo/reset`, {
            method: "POST",
            headers: { "ngrok-skip-browser-warning": "true" },
        });
        setDemoStatus("idle");
        setResponse(null);
    }, []);

    // ── Derived UI state ──
    const isBlocked = demoStatus === "blocked";
    const isApproved = demoStatus === "approved";
    const isLoading = demoStatus === "loading";

    return (
        <div
            className={`
        min-h-screen w-full flex flex-col items-center justify-center
        bg-black transition-all duration-300 p-6
        ${isBlocked ? "ring-4 ring-red-500 ring-inset animate-blocked-flash" : ""}
      `}
        >
            {/* ── Header ── */}
            <div className="w-full max-w-sm mb-8 text-center">
                <div className="inline-flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">
                        Live Demo Mode
                    </span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                    Invisible Fraud Detector
                </h1>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                    Impossible Travel Detection
                </p>
            </div>

            {/* ── Card ── */}
            <div
                className={`
          w-full max-w-sm rounded-2xl border p-6 transition-all duration-300
          ${isBlocked
                        ? "bg-red-950/30 border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                        : isApproved
                            ? "bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_30px_rgba(52,211,153,0.15)]"
                            : "bg-white/[0.03] border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                    }
        `}
            >
                {/* Transaction info */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                            User
                        </p>
                        <p className="text-sm font-bold text-white font-mono">{userId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                            Amount
                        </p>
                        <p className="text-2xl font-black text-white">$500</p>
                    </div>
                </div>

                {/* ── Send Button ── */}
                <button
                    onClick={sendTransaction}
                    disabled={isLoading || isApproved || isBlocked}
                    className={`
            w-full py-4 rounded-xl font-black text-base tracking-wide
            transition-all duration-200 active:scale-95
            disabled:cursor-not-allowed
            ${isLoading
                            ? "bg-white/10 text-gray-400"
                            : isApproved
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : isBlocked
                                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                    : "bg-white text-black hover:bg-gray-100 shadow-lg"
                        }
          `}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                            Analyzing...
                        </span>
                    ) : isApproved ? (
                        "✓ Transaction Approved"
                    ) : isBlocked ? (
                        "✗ Transaction Blocked"
                    ) : (
                        "Send $500"
                    )}
                </button>

                {/* ── Result Panel ── */}
                {response && (
                    <div
                        className={`
              mt-4 rounded-xl p-4 border font-mono text-xs
              ${isBlocked
                                ? "bg-red-950/50 border-red-500/30 text-red-300"
                                : "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
                            }
            `}
                    >
                        {/* Status badge */}
                        <div className="flex items-center gap-2 mb-3">
                            <span
                                className={`
                  px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest
                  ${isBlocked
                                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                    }
                `}
                            >
                                {response.status}
                            </span>
                            {response.reason && (
                                <span className="text-red-400 font-bold">{response.reason}</span>
                            )}
                        </div>

                        {/* Message */}
                        <p className="leading-relaxed mb-3">{response.message}</p>

                        {/* Details */}
                        {response.details && (
                            <div className="space-y-1 pt-3 border-t border-white/10 text-[10px] text-gray-400">
                                {response.details.previous_ip && (
                                    <div className="flex justify-between">
                                        <span>Previous IP</span>
                                        <span className="text-white">{response.details.previous_ip}</span>
                                    </div>
                                )}
                                {response.details.current_ip && (
                                    <div className="flex justify-between">
                                        <span>Current IP</span>
                                        <span className="text-white">{response.details.current_ip}</span>
                                    </div>
                                )}
                                {response.details.time_delta_seconds !== undefined && (
                                    <div className="flex justify-between">
                                        <span>Time Delta</span>
                                        <span className="text-white">
                                            {response.details.time_delta_seconds}s
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Error state */}
                {demoStatus === "error" && (
                    <div className="mt-4 rounded-xl p-4 bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 text-xs font-mono">
                        ⚠ Could not reach backend. Check your Ngrok URL and try again.
                    </div>
                )}
            </div>

            {/* ── Reset button ── */}
            <button
                onClick={resetSession}
                className="mt-6 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest"
            >
                Reset Session
            </button>

            {/* ── How it works hint ── */}
            <p className="mt-8 text-[10px] text-gray-700 font-mono text-center max-w-xs leading-relaxed">
                First tap → approved &amp; IP recorded.
                <br />
                Switch to cellular/VPN → tap again → BLOCKED.
            </p>
        </div>
    );
}

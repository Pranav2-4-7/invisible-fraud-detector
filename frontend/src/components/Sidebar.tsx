"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const isDashboard = pathname === "/";
  const isInvestigation = pathname.startsWith("/investigate");

  return (
    <aside className="hidden md:flex flex-col w-64 h-full p-4 gap-2 bg-black font-['Inter'] text-sm font-medium rounded-r-lg border-r border-white/10 shrink-0">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-white">SECURE_CORE</h2>
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
          V3.4.2 SYSTEM_UPTIME: 99.9%
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        <Link href="/">
          <div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
              isDashboard
                ? "text-white font-bold bg-white/10 scale-98"
                : "text-gray-500 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              dashboard
            </span>
            <span>Dashboard</span>
          </div>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white/70 hover:bg-white/5 rounded-lg cursor-pointer transition-all duration-150">
          <span className="material-symbols-outlined text-[20px]">
            security
          </span>
          <span>Live Feed</span>
        </div>
        <Link href="/investigate">
          <div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
              isInvestigation
                ? "text-white font-bold bg-white/10 scale-98"
                : "text-gray-500 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">hub</span>
            <span>Graph Analysis</span>
          </div>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-white/70 hover:bg-white/5 rounded-lg cursor-pointer transition-all duration-150">
          <span className="material-symbols-outlined text-[20px]">
            settings
          </span>
          <span>Settings</span>
        </div>
      </nav>

      <button className="mt-auto w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-sm">download</span>
        EXPORT_REPORT
      </button>

      {/* Connection indicator for styling from screen 1 */}
      <div className="mt-4 flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-sm">
            sensors
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-white">System Status Node</span>
          <span className="text-[10px] text-primary">OPERATIONAL</span>
        </div>
      </div>
    </aside>
  );
}

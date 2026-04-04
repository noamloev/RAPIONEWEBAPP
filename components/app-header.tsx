"use client";

import { Bell, Search, Sparkles, Download } from "lucide-react";
import { useEffect, useState } from "react";

export function AppHeader({ title }: { title: string }) {
  const [localStatus, setLocalStatus] = useState<"checking" | "online" | "offline">("checking");

  async function checkLocalServer() {
    try {
      const res = await fetch("http://127.0.0.1:8000/health", {
        method: "GET",
      });

      if (res.ok) {
        setLocalStatus("online");
      } else {
        setLocalStatus("offline");
      }
    } catch {
      setLocalStatus("offline");
    }
  }

  useEffect(() => {
    checkLocalServer();

    const interval = setInterval(checkLocalServer, 5000);
    return () => clearInterval(interval);
  }, []);

  function downloadLocalServer() {
    window.open("https://your-server.com/download-local-server", "_blank");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/70 backdrop-blur-xl">
      <div className="flex min-h-[78px] items-center justify-between gap-4 px-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            <Sparkles className="h-3.5 w-3.5" />
            RapidOne Manager
          </div>
          <h2 className="mt-1 truncate text-2xl font-semibold text-[var(--primary-deep)]">
            {title}
          </h2>
        </div>

        <div className="hidden flex-1 justify-center xl:flex">
          <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-[var(--border)] bg-white/90 px-4 py-2 shadow-[var(--shadow-card)]">
            <Search className="h-4 w-4 text-[var(--muted)]" />
            <input
              placeholder="Search pages, products, branches..."
              className="w-full border-none bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-dark)] md:block">
            Company ID: 1
          </div>

          {/* 🔥 LOCAL AGENT STATUS */}
          {localStatus === "online" ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              🟢 Local Agent Connected
            </div>
          ) : localStatus === "offline" ? (
            <button
              onClick={downloadLocalServer}
              className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Download className="h-4 w-4" />
              Download Local Agent
            </button>
          ) : (
            <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
              Checking...
            </div>
          )}

          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary-dark)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
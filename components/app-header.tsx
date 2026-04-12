"use client";

import { Bell, Search, Sparkles, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { onlineApi } from "@/lib/api-online";
import { useLanguage } from "@/components/language-provider";
import { LATEST_AGENT_VERSION, AGENT_INSTALLER_URL } from "@/lib/agent-version";
import { compareVersions } from "@/lib/utils";

type ServerAlert = {
  id: number;
  level: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
};

export function AppHeader({ title }: { title: string }) {
  const [localStatus, setLocalStatus] = useState<"checking" | "online" | "offline">("checking");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ServerAlert[]>([]);
  const { t, dir } = useLanguage();
  const [agentVersion, setAgentVersion] = useState<string>("");
  const [agentNeedsUpdate, setAgentNeedsUpdate] = useState(false);

  async function checkLocalServer() {
  try {
    const healthRes = await fetch("http://127.0.0.1:8000/health", {
      method: "GET",
    });

    if (!healthRes.ok) {
      setLocalStatus("offline");
      setAgentVersion("");
      setAgentNeedsUpdate(false);
      return;
    }

    setLocalStatus("online");

    try {
      const versionRes = await fetch("http://127.0.0.1:8000/version", {
        method: "GET",
      });

      if (versionRes.ok) {
        const versionData = await versionRes.json();
        const localVersion = String(versionData?.version || "").trim();

        setAgentVersion(localVersion);

        if (localVersion) {
          setAgentNeedsUpdate(compareVersions(localVersion, LATEST_AGENT_VERSION) < 0);
        } else {
          setAgentNeedsUpdate(false);
        }
      } else {
        setAgentVersion("");
        setAgentNeedsUpdate(false);
      }
    } catch {
      setAgentVersion("");
      setAgentNeedsUpdate(false);
    }
  } catch {
    setLocalStatus("offline");
    setAgentVersion("");
    setAgentNeedsUpdate(false);
  }
}

  async function loadAlerts() {
    try {
      const res = await onlineApi.get<ServerAlert[]>("/alerts");
      setAlerts(res.data || []);
    } catch {
      setAlerts([]);
    }
  }

  async function markRead(id: number) {
    try {
      await onlineApi.post(`/alerts/${id}/read`);
      await loadAlerts();
    } catch (err) {
      console.error("Failed to mark alert as read", err);
    }
  }

  useEffect(() => {
    checkLocalServer();
    loadAlerts();

    const interval = setInterval(() => {
      checkLocalServer();
      loadAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function downloadLocalServer() {
    window.open(AGENT_INSTALLER_URL, "_blank");
  }

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.is_read).length,
    [alerts]
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/70 backdrop-blur-xl">
      <div
        className={`flex min-h-[78px] items-center justify-between gap-4 px-6 lg:px-8 ${
          dir === "rtl" ? "flex-row-reverse" : ""
        }`}
      >
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
            {t("header.company_id")}: 1
          </div>

          {localStatus === "online" ? (
  agentNeedsUpdate ? (
    <button
      onClick={downloadLocalServer}
      className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
    >
      <Download className="h-4 w-4" />
      {t("header.update_agent")}
      {agentVersion ? ` (${agentVersion} → ${LATEST_AGENT_VERSION})` : ""}
    </button>
  ) : (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
      🟢 {t("header.connected")}
      {agentVersion ? ` ${agentVersion}` : ""}
    </div>
  )
) : localStatus === "offline" ? (
  <button
    onClick={downloadLocalServer}
    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
  >
    <Download className="h-4 w-4" />
    {t("header.download_agent")}
  </button>
) : (
  <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
    {t("header.checking")}
  </div>
)}

          <div className="relative">
            <button
              onClick={() => setAlertsOpen((v) => !v)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary-dark)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            {alertsOpen ? (
              <div className="absolute right-0 top-14 z-50 w-[380px] rounded-3xl border border-rose-200 bg-white p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-rose-950">{t("header.alerts")}</h3>
                  <span className="text-xs text-rose-500">
                    {unreadCount} {t("header.unread")}
                  </span>
                </div>

                <div className="max-h-[380px] space-y-3 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
                      {t("header.no_alerts")}
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-2xl border px-4 py-3 ${
                          alert.is_read
                            ? "border-rose-100 bg-white"
                            : "border-rose-200 bg-rose-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-rose-950">
                              {alert.title}
                            </div>
                            <div className="mt-1 text-sm text-rose-700">
                              {alert.message}
                            </div>
                            <div className="mt-2 text-xs text-rose-400">
                              {alert.created_at
                                ? new Date(alert.created_at).toLocaleString()
                                : "-"}
                            </div>
                          </div>

                          {!alert.is_read ? (
                            <button
                              onClick={() => markRead(alert.id)}
                              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Mark read
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
"use client";

import { Bell, Search, Sparkles, X } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { onlineApi } from "@/lib/api-online";
import { useLanguage } from "@/components/language-provider";
import { getLocalAlerts, markLocalAlertRead, type LocalAlert } from "@/lib/local-alerts";

type ServerAlert = {
  id: number;
  level: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
};

type ReceiptsAlertDetailRow = {
  kind: "missing_receipt" | "missing_invoice" | "mismatch" | "summary_diff";
  client: string;
  id: string;
  invoice_no: string;
  receipt_no: string;
  invoice_total: number;
  receipt_total: number;
  diff: number;
};

type ReceiptsAlertDetails = {
  date_str: string;
  grand_inv: number;
  grand_rec: number;
  grand_diff: number;
  missing_receipt_count: number;
  missing_invoice_count: number;
  mismatch_count: number;
  missing_receipt_details: ReceiptsAlertDetailRow[];
  missing_invoice_details: ReceiptsAlertDetailRow[];
  mismatch_details: ReceiptsAlertDetailRow[];
  summary_diff_details?: ReceiptsAlertDetailRow[];
};

type UnifiedAlert =
  | { source: "server"; data: ServerAlert }
  | { source: "local"; data: LocalAlert };

const RECEIPTS_ALERT_JSON_MARKER = "\n\n__RECEIPTS_ALERT_JSON__=";

function parseReceiptsAlertDetails(message: string): {
  summary: string;
  details: ReceiptsAlertDetails | null;
} {
  const raw = message || "";
  const markerIndex = raw.indexOf(RECEIPTS_ALERT_JSON_MARKER);
  if (markerIndex === -1) {
    return { summary: raw, details: null };
  }

  const summary = raw.slice(0, markerIndex).trim();
  const jsonPart = raw.slice(markerIndex + RECEIPTS_ALERT_JSON_MARKER.length).trim();

  try {
    return {
      summary,
      details: JSON.parse(jsonPart) as ReceiptsAlertDetails,
    };
  } catch {
    return { summary: raw, details: null };
  }
}

function formatDiff(value: number): string {
  const n = Number(value || 0);
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

export function AppHeader({ title, centerContent }: { title: string; centerContent?: ReactNode }) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ServerAlert[]>([]);
  const [localAlerts, setLocalAlerts] = useState<LocalAlert[]>([]);
  const [selectedReceiptsAlert, setSelectedReceiptsAlert] = useState<ServerAlert | null>(null);
  const { t, dir } = useLanguage();

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

  async function deleteServerAlert(id: number) {
    try {
      await onlineApi.delete(`/alerts/${id}`);
      await loadAlerts();
    } catch (err) {
      console.error("Failed to delete alert", err);
    }
  }

  function isLowInventoryAlert(alert: UnifiedAlert["data"]): boolean {
    return alert.title === "Low stock in warehouse";
  }

  function isReceiptsDifferenceAlert(alert: UnifiedAlert["data"]): boolean {
    if (!("title" in alert) || !("message" in alert)) return false;
    return alert.title.startsWith("Receipts check -");
  }

  function getReceiptKindLabel(kind: ReceiptsAlertDetailRow["kind"]): string {
    if (kind === "missing_receipt") return t("pages.daily.receipts_summary_missing_receipt");
    if (kind === "missing_invoice") return t("pages.daily.receipts_summary_missing_invoice");
    if (kind === "mismatch") return t("pages.daily.receipts_summary_mismatch");
    return t("pages.daily.receipts_summary_diff");
  }

  function refreshLocalAlerts() {
    setLocalAlerts(getLocalAlerts());
  }

  useEffect(() => {
    loadAlerts();
    refreshLocalAlerts();

    const interval = setInterval(() => {
      loadAlerts();
    }, 5000);

    window.addEventListener("rapidone-alerts-changed", refreshLocalAlerts);

    return () => {
      clearInterval(interval);
      window.removeEventListener("rapidone-alerts-changed", refreshLocalAlerts);
    };
  }, []);

  const unreadCount = useMemo(
    () =>
      alerts.filter((a) => !a.is_read).length +
      localAlerts.filter((a) => !a.is_read).length,
    [alerts, localAlerts]
  );

  const allAlerts: UnifiedAlert[] = useMemo(() => {
    const server = alerts.map((d) => ({ source: "server" as const, data: d }));
    const local = localAlerts.map((d) => ({ source: "local" as const, data: d }));
    return [...server, ...local].sort((a, b) => {
      const aDate = a.data.created_at ?? "";
      const bDate = b.data.created_at ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [alerts, localAlerts]);

  const selectedReceiptsParsed = useMemo(
    () => parseReceiptsAlertDetails(selectedReceiptsAlert?.message || ""),
    [selectedReceiptsAlert]
  );

  const receiptsRows = useMemo(() => {
    if (!selectedReceiptsParsed.details) return [];
    return [
      ...selectedReceiptsParsed.details.missing_receipt_details,
      ...selectedReceiptsParsed.details.missing_invoice_details,
      ...selectedReceiptsParsed.details.mismatch_details,
      ...(selectedReceiptsParsed.details.summary_diff_details || []),
    ];
  }, [selectedReceiptsParsed.details]);

  return (
    <>
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
            {centerContent ? (
              centerContent
            ) : (
              <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-[var(--border)] bg-white/90 px-4 py-2 shadow-[var(--shadow-card)]">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  placeholder={t("header.search_placeholder")}
                  className="w-full border-none bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-dark)] md:block">
              {t("header.company_id")}: 1
            </div>

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
                    {allAlerts.length === 0 ? (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-600">
                        {t("header.no_alerts")}
                      </div>
                    ) : (
                      allAlerts.map((item, idx) => {
                        const alert = item.data;
                        const isRead = alert.is_read;
                        const lowInventory = isLowInventoryAlert(alert);
                        const receiptsAlert = isReceiptsDifferenceAlert(alert);
                        const parsed = "message" in alert ? parseReceiptsAlertDetails(alert.message) : null;
                        const summaryText = parsed?.summary || alert.message;
                        const showMarkRead =
                          !isRead && item.source === "server" && !lowInventory && !receiptsAlert;
                        const showDelete =
                          isRead && item.source === "server" && !lowInventory;
                        const showFullDetails =
                          !isRead && item.source === "server" && receiptsAlert;

                        return (
                          <div
                            key={item.source === "server" ? `srv-${(alert as ServerAlert).id}` : `loc-${idx}`}
                            className={`rounded-2xl border px-4 py-3 ${
                              isRead ? "border-rose-100 bg-white" : "border-rose-200 bg-rose-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-rose-950">
                                  {alert.title}
                                </div>
                                <div className="mt-1 break-words text-sm text-rose-700 whitespace-pre-wrap">
                                  {summaryText}
                                </div>
                                <div className="mt-2 text-xs text-rose-400">
                                  {alert.created_at
                                    ? new Date(alert.created_at).toLocaleString()
                                    : "-"}
                                </div>
                              </div>

                              {showFullDetails ? (
                                <button
                                  onClick={() => setSelectedReceiptsAlert(alert as ServerAlert)}
                                  className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  {t("header.full_details")}
                                </button>
                              ) : null}

                              {showMarkRead ? (
                                <button
                                  onClick={() => {
                                    if (item.source === "server") {
                                      markRead((alert as ServerAlert).id);
                                    } else {
                                      markLocalAlertRead((alert as LocalAlert).id);
                                      refreshLocalAlerts();
                                    }
                                  }}
                                  className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  {t("header.mark_read")}
                                </button>
                              ) : null}

                              {showDelete ? (
                                <button
                                  onClick={() => deleteServerAlert((alert as ServerAlert).id)}
                                  className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  {t("common.delete")}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {selectedReceiptsAlert ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-rose-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-[var(--primary-deep)]">
                  {selectedReceiptsAlert.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] whitespace-pre-wrap">
                  {selectedReceiptsParsed.summary}
                </p>
              </div>

              <button
                onClick={() => setSelectedReceiptsAlert(null)}
                className="rounded-full border border-[var(--border)] bg-white p-2 text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 border-b border-[var(--border)] bg-[var(--card-soft)] px-6 py-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("pages.daily.receipts_summary_missing_receipt")}</div>
                <div className="mt-1 text-xl font-semibold text-[var(--primary-deep)]">
                  {selectedReceiptsParsed.details?.missing_receipt_count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("pages.daily.receipts_summary_missing_invoice")}</div>
                <div className="mt-1 text-xl font-semibold text-[var(--primary-deep)]">
                  {selectedReceiptsParsed.details?.missing_invoice_count ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("pages.daily.receipts_summary_mismatch")}</div>
                <div className="mt-1 text-xl font-semibold text-[var(--primary-deep)]">
                  {selectedReceiptsParsed.details?.mismatch_count ?? 0}
                </div>
              </div>
            </div>

            <div className="max-h-[46vh] overflow-auto px-6 py-5">
              {receiptsRows.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                  {t("header.receipts_no_details")}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
                  <thead className="bg-[var(--card-soft)]">
                    <tr>
                      {[t("table.type"), t("table.customer"), t("table.number"), t("table.invoice"), t("pages.daily.receipts_summary_receipts"), t("pages.daily.receipts_summary_diff")].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-white">
                    {receiptsRows.map((row, index) => (
                      <tr key={`${row.kind}-${row.id}-${row.invoice_no}-${row.receipt_no}-${index}`}>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">
                          {getReceiptKindLabel(row.kind)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--primary-deep)]">
                          {row.client || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.id || "-"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.invoice_no || "-"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.receipt_no || "-"}</td>
                        <td
                          className={`px-4 py-3 text-sm font-semibold ${
                            row.diff === 0
                              ? "text-[var(--muted-strong)]"
                              : row.diff > 0
                              ? "text-rose-700"
                              : "text-amber-700"
                          }`}
                        >
                          {formatDiff(row.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-5">
              <button
                onClick={() => setSelectedReceiptsAlert(null)}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)]"
              >
                {t("common.close")}
              </button>
              <button
                onClick={async () => {
                  if (!selectedReceiptsAlert) return;
                  await markRead(selectedReceiptsAlert.id);
                  setSelectedReceiptsAlert(null);
                }}
                className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5"
              >
                {t("header.mark_read")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

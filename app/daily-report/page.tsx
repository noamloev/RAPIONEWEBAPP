"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import {
  Branch,
  DailyRunStatus,
  DailySummary,
  FlagRow,
  InventoryHistoryRow,
  SaleRow,
} from "@/lib/types";
import { addLocalAlert } from "@/lib/local-alerts";
import { useLanguage } from "@/components/language-provider";

function formatDateForApi(date: string) {
  return date;
}

function formatDateForLocalReceipts(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

type ViewMode = "sales" | "flags" | "runs" | "inventory";

function LuxuryCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--primary-deep)]">{title}</h3>
        {description ? (
          <p className="text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function LuxuryInputClass() {
  return "rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--border-strong)] focus:bg-white";
}

export default function DailyReportPage() {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);

  const [receiptsJobId, setReceiptsJobId] = useState("");
  const [dailyJobId, setDailyJobId] = useState<string>("");
  const [dailyJobStatus, setDailyJobStatus] = useState<string>("");
  const [dailyProgressLines, setDailyProgressLines] = useState<string[]>([]);

  const [dateStr, setDateStr] = useState(today);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("All branches");
  const [applyInventory, setApplyInventory] = useState(true);
  const [selectedView, setSelectedView] = useState<ViewMode>("sales");

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [runStatuses, setRunStatuses] = useState<DailyRunStatus[]>([]);
  const [inventoryChanges, setInventoryChanges] = useState<InventoryHistoryRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [runningDaily, setRunningDaily] = useState(false);
  const [checkingReceipts, setCheckingReceipts] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const allBranchesLabel = t("pages.daily.all_branches");
  const branchParam = selectedBranch === allBranchesLabel ? undefined : selectedBranch;

  async function loadBranches() {
    try {
      const res = await onlineApi.get<Branch[]>("/branches");
      setBranches(res.data ?? []);
    } catch {
      // non-critical — silently ignore
    }
  }

  async function loadSummary() {
    try {
      const res = await onlineApi.get<DailySummary>("/report/daily", {
        params: {
          date_str: formatDateForApi(dateStr),
          ...(branchParam ? { branch: branchParam } : {}),
        },
      });
      setSummary(res.data);
    } catch {
      setSummary(null);
    }
  }

  async function loadSales() {
    try {
      const res = await onlineApi.get<SaleRow[]>("/report/sales", {
        params: {
          date_str: formatDateForApi(dateStr),
          ...(branchParam ? { branch: branchParam } : {}),
        },
      });
      setSales(res.data ?? []);
    } catch {
      setSales([]);
    }
  }

  async function loadFlags() {
    try {
      const res = await onlineApi.get<FlagRow[]>("/report/flags", {
        params: {
          date_str: formatDateForApi(dateStr),
          ...(branchParam ? { branch: branchParam } : {}),
        },
      });
      setFlags(res.data ?? []);
    } catch {
      setFlags([]);
    }
  }

  async function loadRunStatuses() {
    try {
      const dt = new Date(dateStr);
      const year = dt.getFullYear();
      const month = dt.getMonth() + 1;
      const res = await onlineApi.get<DailyRunStatus[]>("/daily-runs/status", {
        params: { year, month },
      });
      setRunStatuses(res.data ?? []);
    } catch {
      setRunStatuses([]);
    }
  }

  async function loadInventoryChanges() {
    try {
      const res = await onlineApi.get<InventoryHistoryRow[]>("/inventory/history", {
        params: { date_str: dateStr, limit: 100 },
      });
      setInventoryChanges(res.data ?? []);
    } catch {
      setInventoryChanges([]);
    }
  }

  async function refreshAll() {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      await Promise.all([
        loadBranches(),
        loadSummary(),
        loadSales(),
        loadFlags(),
        loadRunStatuses(),
        loadInventoryChanges(),
      ]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e?.response?.data?.detail || e?.message || t("pages.daily.load_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, selectedBranch]);

  // Receipts polling
  useEffect(() => {
    if (!receiptsJobId) return;
    const timer = setInterval(async () => {
      try {
        const res = await localApi.get("/local/check-receipts/status", {
          params: { job_id: receiptsJobId },
        });
        const data = res.data;
        if (!data?.ok) return;
        if (data.status === "done") {
          clearInterval(timer);
          setCheckingReceipts(false);
          const result = data.result;
          const missingReceiptCount = result?.missing_receipt?.length ?? 0;
          const missingInvoiceCount = result?.missing_invoice?.length ?? 0;
          const mismatchCount = result?.mismatch?.length ?? 0;
          addLocalAlert({
            level: missingReceiptCount > 0 || missingInvoiceCount > 0 || mismatchCount > 0 ? "warn" : "success",
            title: t("pages.daily.receipts_finished_title").replace("{date}", result?.date_str ?? ""),
            message:
              `${t("pages.daily.receipts_summary_invoices")}: ${result?.grand_inv ?? 0}, ` +
              `${t("pages.daily.receipts_summary_receipts")}: ${result?.grand_rec ?? 0}, ` +
              `${t("pages.daily.receipts_summary_diff")}: ${result?.grand_diff ?? 0}. ` +
              `${t("pages.daily.receipts_summary_missing_receipt")}: ${missingReceiptCount}, ` +
              `${t("pages.daily.receipts_summary_missing_invoice")}: ${missingInvoiceCount}, ` +
              `${t("pages.daily.receipts_summary_mismatch")}: ${mismatchCount}.`,
          });
          setSuccessMessage(t("pages.daily.receipts_finished_success"));
        }
        if (data.status === "error") {
          clearInterval(timer);
          setCheckingReceipts(false);
          addLocalAlert({ level: "error", title: t("pages.daily.receipts_failed_title"), message: data.error || t("pages.daily.receipts_failed_unknown") });
          setError(data.error || t("pages.daily.receipts_failed"));
        }
      } catch (err: unknown) {
        clearInterval(timer);
        setCheckingReceipts(false);
        const e = err as { response?: { data?: { detail?: string } }; message?: string };
        setError(e?.response?.data?.detail || e?.message || t("pages.daily.receipts_status_failed"));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [receiptsJobId, t]);

  // Daily job polling
  useEffect(() => {
    if (!dailyJobId) return;
    const timer = setInterval(async () => {
      try {
        const res = await localApi.get("/ensure/daily/status", {
          params: { job_id: dailyJobId },
        });
        const data = res.data;
        if (!data?.ok) return;
        setDailyJobStatus(data.status || "");
        setDailyProgressLines(data.progress_lines || []);
        if (data.status === "done") {
          clearInterval(timer);
          setRunningDaily(false);
          setSuccessMessage(t("pages.daily.run_completed"));
          // Optimistically mark the selected date as GREEN for past dates —
          // the server confirms this on the next refresh.
          const todayStr = new Date().toISOString().slice(0, 10);
          if (dateStr < todayStr) {
            setRunStatuses((prev) => {
              const rest = prev.filter((r) => r.date !== dateStr);
              return [...rest, { date: dateStr, status: "GREEN" }].sort((a, b) =>
                a.date.localeCompare(b.date)
              );
            });
          }
          await refreshAll();
        }
        if (data.status === "error") {
          clearInterval(timer);
          setRunningDaily(false);
          setError(data.error || t("pages.daily.run_failed"));
        }
      } catch (err: unknown) {
        clearInterval(timer);
        setRunningDaily(false);
        const e = err as { response?: { data?: { detail?: string } }; message?: string };
        setError(e?.response?.data?.detail || e?.message || t("pages.daily.status_failed"));
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyJobId, t]);

  async function handleRunDaily() {
    try {
      setRunningDaily(true);
      setError("");
      setSuccessMessage("");
      setDailyProgressLines([]);
      setDailyJobId("");
      setDailyJobStatus("");
      const res = await localApi.post("/ensure/daily/start", null, {
        params: {
          date_str: formatDateForApi(dateStr),
          branch: branchParam || "all",
          apply_inventory: applyInventory ? 1 : 0,
        },
      });
      const jobId = res.data?.job_id;
      if (!jobId) throw new Error(t("pages.daily.no_job_id"));
      setDailyJobId(jobId);
      setDailyJobStatus("running");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e?.response?.data?.detail || e?.message || t("pages.daily.run_failed"));
      setRunningDaily(false);
    }
  }

  async function handleCheckReceipts() {
    try {
      setCheckingReceipts(true);
      setError("");
      setSuccessMessage("");
      const res = await localApi.post("/local/check-receipts/start", null, {
        params: { date_str: formatDateForLocalReceipts(dateStr) },
      });
      const jobId = res.data?.job_id;
      if (!jobId) throw new Error(t("pages.daily.no_receipts_job_id"));
      setReceiptsJobId(jobId);
      setSuccessMessage(t("pages.daily.receipts_started"));
    } catch (err: unknown) {
      setCheckingReceipts(false);
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e?.response?.data?.detail || e?.message || t("pages.daily.receipts_failed"));
    }
  }

  const stats = useMemo(() => {
    const flagsCount = flags.length;
    const critCount = flags.filter((f) => f.severity === "CRIT").length;
    const warnCount = flags.filter((f) => f.severity === "WARN").length;
    return { flagsCount, critCount, warnCount };
  }, [flags]);

  const selectedDateRunStatus = useMemo(() => {
    const found = runStatuses.find((r) => r.date === dateStr);
    return found?.status || "NONE";
  }, [runStatuses, dateStr]);

  // Progress: use row-based percent if available, else indeterminate when running
  const progressPercent = useMemo(() => {
    if (dailyJobStatus === "done" || dailyJobStatus === "error") return 100;
    const rowLine = [...dailyProgressLines]
      .reverse()
      .find((line) => line.toLowerCase().includes("processing excel row"));
    if (!rowLine) return dailyJobStatus === "running" ? -1 : 0; // -1 = indeterminate
    const match = rowLine.match(/processing excel row\s+(\d+)\/(\d+)/i);
    if (!match) return -1;
    const current = Number(match[1]);
    const total = Number(match[2]);
    if (!total) return -1;
    return Math.min(99, Math.round((current / total) * 100));
  }, [dailyProgressLines, dailyJobStatus]);

  // Last few progress lines for live log
  const recentLines = useMemo(() => dailyProgressLines.slice(-6), [dailyProgressLines]);

  const statusLabel =
    selectedDateRunStatus === "GREEN"
      ? t("pages.daily.status_green")
      : selectedDateRunStatus === "YELLOW"
      ? t("pages.daily.status_yellow")
      : selectedDateRunStatus;

  return (
    <PageShell title={t("pages.daily.title")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
            {successMessage}
          </div>
        ) : null}

        {/* Filters & Actions */}
        <LuxuryCard title={t("pages.daily.filters_actions")} description={t("pages.daily.filters_actions_desc")}>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">{t("pages.daily.date")}</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className={LuxuryInputClass()}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">{t("pages.daily.branch")}</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={LuxuryInputClass()}
              >
                <option value={allBranchesLabel}>{allBranchesLabel}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
                <input
                  type="checkbox"
                  checked={applyInventory}
                  onChange={(e) => setApplyInventory(e.target.checked)}
                />
                {t("pages.daily.apply_inventory")}
              </label>
            </div>

            <div className="flex items-end justify-end text-sm">
              <div
                className={`rounded-2xl border px-4 py-3 font-medium ${
                  selectedDateRunStatus === "GREEN"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : selectedDateRunStatus === "YELLOW"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-[var(--border)] bg-white text-[var(--muted-strong)]"
                }`}
              >
                {t("pages.daily.run_status")}: {statusLabel}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleRunDaily}
              disabled={runningDaily}
              className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningDaily ? t("pages.daily.running") : t("pages.daily.run_daily")}
            </button>

            <button
              onClick={handleCheckReceipts}
              disabled={checkingReceipts}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingReceipts ? t("pages.daily.checking") : t("pages.daily.check_receipts")}
            </button>

            <button
              onClick={refreshAll}
              disabled={loading}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("common.refreshing") : t("common.refresh")}
            </button>
          </div>
        </LuxuryCard>

        {/* Progress card — shown while job running or just finished */}
        {dailyJobId ? (
          <LuxuryCard title={t("pages.daily.progress_title")}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--muted)]">
                {dailyJobStatus === "done"
                  ? t("pages.daily.completed")
                  : dailyJobStatus === "error"
                  ? t("pages.daily.failed")
                  : t("pages.daily.running")}
              </p>
              <div
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  dailyJobStatus === "done"
                    ? "bg-emerald-50 text-emerald-700"
                    : dailyJobStatus === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-[var(--card-soft)] text-[var(--primary-dark)]"
                }`}
              >
                {dailyJobStatus || "running"}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted-strong)]">
                <span>{t("pages.daily.progress")}</span>
                <span>{progressPercent === -1 ? "…" : `${progressPercent}%`}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--accent)]">
                {progressPercent === -1 ? (
                  // Indeterminate — animated stripe
                  <div
                    className="h-3 w-1/3 rounded-full bg-[var(--primary-strong)]"
                    style={{ animation: "slide 1.4s linear infinite" }}
                  />
                ) : (
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      dailyJobStatus === "done"
                        ? "bg-emerald-500"
                        : dailyJobStatus === "error"
                        ? "bg-red-500"
                        : "bg-[var(--primary-strong)]"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                )}
              </div>
            </div>

            {/* Live log */}
            {recentLines.length > 0 ? (
              <div className="mt-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("pages.daily.progress_log")}
                </p>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 font-mono text-xs leading-relaxed text-[var(--muted-strong)]">
                  {recentLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </LuxuryCard>
        ) : null}

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: t("pages.daily.sales_count"), value: summary?.sales_count ?? "--", view: "sales" as ViewMode },
            { label: t("pages.daily.revenue"), value: summary?.revenue ?? "--", view: "sales" as ViewMode },
            { label: t("pages.daily.flags"), value: stats.flagsCount, view: "flags" as ViewMode },
            { label: t("pages.daily.crit_flags"), value: stats.critCount, view: "flags" as ViewMode },
            { label: t("pages.daily.inventory_tab"), value: inventoryChanges.length, view: "inventory" as ViewMode },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setSelectedView(item.view)}
              className={`rounded-[28px] border p-5 text-left shadow-[var(--shadow-card)] transition ${
                selectedView === item.view
                  ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,#fff8fb_0%,#f8e7ef_100%)]"
                  : "border-[var(--border)] bg-white/88 hover:bg-[var(--card-soft)]"
              }`}
            >
              <p className="text-sm text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">{item.value}</p>
            </button>
          ))}
        </div>

        {/* View tabs */}
        <div className="flex flex-wrap gap-2">
          {(["sales", "flags", "inventory", "runs"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setSelectedView(v)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                selectedView === v
                  ? "bg-[var(--primary-strong)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--muted-strong)] hover:bg-[var(--card-soft)]"
              }`}
            >
              {v === "sales" ? t("pages.daily.sales_title")
               : v === "flags" ? t("pages.daily.flags_title")
               : v === "inventory" ? t("pages.daily.inventory_tab")
               : t("pages.daily.runs_title")}
            </button>
          ))}
        </div>

        {/* Sales table */}
        {selectedView === "sales" ? (
          <LuxuryCard title={t("pages.daily.sales_title")} description={t("pages.daily.sales_desc")}>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    {[
                      t("table.type"), t("table.date"), t("table.branch"),
                      t("table.invoice"), t("table.customer"), t("table.item"),
                      t("table.qty"), t("table.unit_price"), t("table.total"),
                    ].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-white">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        {loading ? t("common.loading") : t("pages.daily.no_sales")}
                      </td>
                    </tr>
                  ) : (
                    sales.map((row) => {
                      const relatedFlag = flags.find((f) => f.line_key && f.line_key === row.line_key);
                      const rowClass =
                        relatedFlag?.severity === "CRIT"
                          ? "bg-red-50 hover:bg-red-100/60"
                          : relatedFlag?.severity === "WARN"
                          ? "bg-amber-50 hover:bg-amber-100/60"
                          : "hover:bg-[var(--card-soft)]";
                      return (
                        <tr key={row.line_key} className={rowClass}>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.classification || "-"}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                            {row.doc_date ? new Date(row.doc_date).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-4 text-sm text-[var(--foreground)]">{row.branch}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.invoice_no || "-"}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.customer_name || "-"}</td>
                          <td className="px-4 py-4 text-sm text-[var(--foreground)]">{row.item_name}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.quantity}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.unit_price ?? "-"}</td>
                          <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.total ?? "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </LuxuryCard>
        ) : null}

        {/* Flags table */}
        {selectedView === "flags" ? (
          <LuxuryCard title={t("pages.daily.flags_title")} description={t("pages.daily.flags_desc")}>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    {[
                      t("table.severity"), t("table.date"), t("table.branch"),
                      t("table.item"), t("table.invoice"), t("table.reason"),
                    ].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-white">
                  {flags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        {loading ? t("common.loading") : t("pages.daily.no_flags")}
                      </td>
                    </tr>
                  ) : (
                    flags.map((flag, idx) => (
                      <tr
                        key={`${flag.line_key || flag.invoice_no || "flag"}-${idx}`}
                        className={
                          flag.severity === "CRIT"
                            ? "bg-red-50 hover:bg-red-100/60"
                            : flag.severity === "WARN"
                            ? "bg-amber-50 hover:bg-amber-100/60"
                            : "hover:bg-[var(--card-soft)]"
                        }
                      >
                        <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">{flag.severity}</td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                          {flag.flag_date ? new Date(flag.flag_date).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{flag.branch || "-"}</td>
                        <td className="px-4 py-4 text-sm text-[var(--foreground)]">{flag.item_name || "-"}</td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{flag.invoice_no || "-"}</td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{flag.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </LuxuryCard>
        ) : null}

        {/* Inventory changes table */}
        {selectedView === "inventory" ? (
          <LuxuryCard title={t("pages.daily.inventory_title")} description={t("pages.daily.inventory_desc")}>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    {[
                      t("table.product_code"), t("table.product_name"), t("table.branch"),
                      t("table.change_type"), t("table.old_qty"), t("table.new_qty"),
                      t("table.qty_delta"), t("table.source"),
                    ].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-white">
                  {inventoryChanges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        {loading ? t("common.loading") : t("pages.daily.no_inventory")}
                      </td>
                    </tr>
                  ) : (
                    inventoryChanges.map((row, idx) => (
                      <tr key={`${row.action_group_id}-${idx}`} className={`hover:bg-[var(--card-soft)] ${row.is_reverted ? "opacity-50 line-through" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--muted-strong)]">{row.product_code}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{row.product_name}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.branch_name}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.change_type}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.old_qty}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-strong)]">{row.new_qty}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${row.qty_delta < 0 ? "text-red-600" : row.qty_delta > 0 ? "text-emerald-600" : "text-[var(--muted)]"}`}>
                          {row.qty_delta > 0 ? `+${row.qty_delta}` : row.qty_delta}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted)]">{row.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </LuxuryCard>
        ) : null}

        {/* Run statuses calendar */}
        {selectedView === "runs" ? (
          <LuxuryCard title={t("pages.daily.runs_title")} description={t("pages.daily.runs_desc")}>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {runStatuses.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                  {t("pages.daily.no_run_statuses")}
                </div>
              ) : (
                runStatuses.map((status) => (
                  <button
                    key={status.date}
                    onClick={() => setDateStr(status.date)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition hover:shadow-md ${
                      status.date === dateStr
                        ? "ring-2 ring-[var(--primary-strong)]"
                        : ""
                    } ${
                      status.status === "GREEN"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : status.status === "YELLOW"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-[var(--border)] bg-white text-[var(--muted-strong)]"
                    }`}
                  >
                    <div className="font-medium">{status.date}</div>
                    <div>
                      {status.status === "GREEN"
                        ? t("pages.daily.status_green")
                        : status.status === "YELLOW"
                        ? t("pages.daily.status_yellow")
                        : status.status}
                    </div>
                  </button>
                ))
              )}
            </div>
          </LuxuryCard>
        ) : null}
      </div>

      {/* Keyframe for indeterminate progress bar */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </PageShell>
  );
}

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

type ViewMode = "sales" | "flags" | "runs" | "inventory";

type HttpTestRow = {
  customer_name: string;
  item_name: string;
  total: number;
  item_code: string;
  branch_name: string;
  invoice_no: string;
  doc_date: string;
  classification?: string;
};

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

  const [httpTestLoading, setHttpTestLoading] = useState(false);
  const [httpTestResult, setHttpTestResult] = useState<{
    total_rows: number;
    filtered_system_items: number;
    rows: HttpTestRow[];
  } | null>(null);
  const [httpTestError, setHttpTestError] = useState("");

  // Test: new direct-HTTP pipeline
  type RawRow = {
    doc_date: string;
    branch_name: string;
    invoice_no: string;
    customer_name: string;
    mobile: string;
    item_code: string;
    item_name: string;
    quantity: number;
    unit_price: number | null;
    total: number | null;
    discount_pct: number | null;
    high_discount: boolean;
    classification: string;
    classification_reason: string;
    line_key: string;
    is_tracked: boolean;
  };
  type TestRunResult = {
    ok: boolean;
    date: string;
    total_rows_fetched: number;
    filtered_system_items: number;
    tracked_rows: number;
    untracked_rows: number;
    client_activity_created: number;
    sales_created: number;
    sales_updated: number;
    deductions_applied: number;
    discount_flags_created: number;
    apply_inventory: boolean;
    log_lines: string[];
    raw_rows: RawRow[];
  };
  const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
  const [testRunError, setTestRunError] = useState("");
  const [lastRanAt, setLastRanAt] = useState<string | null>(null);

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
        params: { date_str: dateStr, limit: 100, source: "daily_report" },
      });
      setInventoryChanges(res.data ?? []);
    } catch {
      setInventoryChanges([]);
    }
  }

  async function loadLastRanAt() {
    try {
      const res = await onlineApi.get<{ last_ran_at: string | null }>("/daily-runs/latest");
      setLastRanAt(res.data?.last_ran_at ?? null);
    } catch {
      // non-critical
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
        loadLastRanAt(),
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

  const [forceRunning, setForceRunning] = useState(false);

  async function _runDaily(forceReclassify: boolean) {
    const setLoaderFn = forceReclassify ? setForceRunning : setRunningDaily;
    try {
      setLoaderFn(true);
      setError("");
      setSuccessMessage("");
      setTestRunResult(null);
      setTestRunError("");

      const res = await onlineApi.post("/rapidone/daily/run", null, {
        params: {
          date_str: dateStr,
          ...(branchParam ? { branch: branchParam } : {}),
          apply_inventory: applyInventory,
          ...(forceReclassify ? { force_reclassify: true } : {}),
        },
      });
      setTestRunResult(res.data);
      setSuccessMessage(t("pages.daily.run_completed"));
      await loadLastRanAt();
      await Promise.all([loadSummary(), loadSales(), loadFlags(), loadRunStatuses()]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setTestRunError(e?.response?.data?.detail || e?.message || t("pages.daily.run_failed"));
      setError(e?.response?.data?.detail || e?.message || t("pages.daily.run_failed"));
    } finally {
      setLoaderFn(false);
    }
  }

  async function handleRunDaily() {
    try {
      setRunningDaily(true);
      setError("");
      setSuccessMessage("");
      setTestRunResult(null);
      setTestRunError("");

      // ── HTTP pipeline (online server) ─────────────────────────────────────
      const res = await onlineApi.post("/rapidone/daily/run", null, {
        params: {
          date_str: dateStr,
          ...(branchParam ? { branch: branchParam } : {}),
          apply_inventory: applyInventory,
        },
      });
      setTestRunResult(res.data);
      setSuccessMessage(t("pages.daily.run_completed"));
      await loadLastRanAt();
      await Promise.all([loadSummary(), loadSales(), loadFlags(), loadRunStatuses()]);

      // ── Local server fallback (keep as comment for emergency use) ─────────
      // const res = await localApi.post("/ensure/daily/start", null, {
      //   params: {
      //     date_str: formatDateForApi(dateStr),
      //     branch: branchParam || "all",
      //     apply_inventory: applyInventory ? 1 : 0,
      //   },
      // });
      // const jobId = res.data?.job_id;
      // if (!jobId) throw new Error(t("pages.daily.no_job_id"));
      // setDailyJobId(jobId);
      // setDailyJobStatus("running");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setTestRunError(e?.response?.data?.detail || e?.message || t("pages.daily.run_failed"));
      setError(e?.response?.data?.detail || e?.message || t("pages.daily.run_failed"));
    } finally {
      setRunningDaily(false);
    }
  }

  async function handleCheckReceipts() {
    try {
      setCheckingReceipts(true);
      setError("");
      setSuccessMessage("");
      const res = await onlineApi.post("/checks/receipts/run", null, {
        params: { date_str: dateStr },
      });
      const result = res.data;
      const missingReceiptCount = result?.missing_receipt_count ?? result?.missing_receipt?.length ?? 0;
      const missingInvoiceCount = result?.missing_invoice_count ?? result?.missing_invoice?.length ?? 0;
      const mismatchCount = result?.mismatch_count ?? result?.mismatch?.length ?? 0;
      setSuccessMessage(t("pages.daily.receipts_finished_success"));

      // Local-server fallback kept as a rollback reference.
      // const res = await localApi.post("/local/check-receipts/start", null, {
      //   params: { date_str: formatDateForLocalReceipts(dateStr) },
      // });
      // const jobId = res.data?.job_id;
      // if (!jobId) throw new Error(t("pages.daily.no_receipts_job_id"));
      // setReceiptsJobId(jobId);
      // setSuccessMessage(t("pages.daily.receipts_started"));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e?.response?.data?.detail || e?.message || t("pages.daily.receipts_failed"));
    } finally {
      setCheckingReceipts(false);
    }
  }

  async function handleHttpTest() {
    try {
      setHttpTestLoading(true);
      setHttpTestResult(null);
      setHttpTestError("");
      const res = await onlineApi.get("/rapidone/daily/test-http", {
        params: { date_str: dateStr },
      });
      setHttpTestResult(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setHttpTestError(e?.response?.data?.detail || e?.message || "HTTP test failed");
    } finally {
      setHttpTestLoading(false);
    }
  }

  function handleDownloadCsv() {
    if (!testRunResult?.raw_rows?.length) return;

    const escape = (v: string | number | null | undefined) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "Date", "Branch", "Invoice", "Customer", "Mobile",
      "Item Code", "Item Name", "Qty", "Unit Price", "Total",
      "Discount %", "High Discount", "Classification", "Classification Reason", "Line Key",
    ];

    const csvRows = testRunResult.raw_rows.filter((r) => r.is_tracked);

    const lines = [
      headers.map(escape).join(","),
      ...csvRows.map((r) =>
        [
          r.doc_date,
          r.branch_name,
          r.invoice_no,
          r.customer_name,
          r.mobile,
          r.item_code,
          r.item_name,
          r.quantity,
          r.unit_price ?? "",
          r.total ?? "",
          r.discount_pct ?? "",
          r.high_discount ? "YES" : "",
          r.classification,
          r.classification_reason ?? "",
          r.line_key,
        ].map(escape).join(",")
      ),
    ];

    // utf-8 BOM so Excel opens Hebrew text correctly
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `daily_report_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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

  const nextRunTime = (() => {
    const schedule = [8, 10, 12, 14, 16, 18, 20, 22];
    const now = new Date();
    const h = now.getHours();
    const next = schedule.find((s) => s > h);
    if (!next) return t("pages.daily.next_run_tomorrow");
    const d = new Date();
    d.setHours(next, 0, 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  })();

  const lastRanAtDisplay = (
    <div className="flex w-full max-w-lg items-center gap-4 rounded-full border border-[var(--border)] bg-white/90 px-4 py-2 shadow-[var(--shadow-card)]">
      {lastRanAt ? (
        <>
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {t("pages.daily.last_ran_at")}
          </span>
          <span className="text-sm font-medium text-[var(--primary-dark)]">
            {new Date(lastRanAt).toLocaleString()}
          </span>
          <span className="text-[var(--border)]">|</span>
        </>
      ) : null}
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        {t("pages.daily.next_run")}
      </span>
      <span className="text-sm font-medium text-emerald-700">{nextRunTime}</span>
    </div>
  );

  return (
    <PageShell title={t("pages.daily.title")} headerCenter={lastRanAtDisplay}>
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
              disabled={runningDaily || forceRunning}
              className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningDaily ? t("pages.daily.running") : t("pages.daily.run_daily")}
            </button>

            <button
              onClick={() => _runDaily(true)}
              disabled={runningDaily || forceRunning}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {forceRunning ? t("pages.daily.running") : t("pages.daily.recheck_all")}
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


          {/* TEMP TEST SECTION - REMOVE BEFORE PROD */}
          {/*<div className="mt-4 rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-50 p-4">
            <p className="mb-2 text-xs font-bold text-yellow-700">
              ⚠ TEMP – REMOVE BEFORE PROD
            </p>
            <button
              onClick={handleHttpTest}
              disabled={httpTestLoading}
              className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {httpTestLoading ? t("common.loading") : "🧪 Daily Report Test (HTTP)"}
            </button>

            {httpTestError && (
              <p className="mt-2 text-sm text-red-600">{httpTestError}</p>
            )}

            {httpTestResult && (
              <div className="mt-3">
                <p className="text-sm text-gray-700">
                  {t("pages.daily.httpTestTotalRows")}: <strong>{httpTestResult.total_rows}</strong>
                  {" | "}
                  {t("pages.daily.httpTestFiltered")}: <strong>{httpTestResult.filtered_system_items}</strong>
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-yellow-100">
                        <th className="border border-yellow-300 px-2 py-1 text-left">{t("table.customerName")}</th>
                        <th className="border border-yellow-300 px-2 py-1 text-left">{t("table.itemName")}</th>
                        <th className="border border-yellow-300 px-2 py-1 text-right">{t("table.total")}</th>
                        <th className="border border-yellow-300 px-2 py-1 text-left">{t("pages.daily.httpTestClassification")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {httpTestResult.rows.map((row: HttpTestRow, i: number) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          <td className="border border-yellow-300 px-2 py-1">{row.customer_name}</td>
                          <td className="border border-yellow-300 px-2 py-1">{row.item_name}</td>
                          <td className="border border-yellow-300 px-2 py-1 text-right">{row.total}</td>
                          <td className="border border-yellow-300 px-2 py-1">{row.classification ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>*/}
        </LuxuryCard>

        {/* Loading bar — shown while a run is in progress */}
        {(runningDaily || forceRunning) ? (
          <div className="rounded-[30px] border border-[var(--border)] bg-white/88 px-6 py-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted-strong)]">
              <span>{forceRunning ? t("pages.daily.recheck_all") : t("pages.daily.run_daily")} — {t("pages.daily.running")}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--accent)]">
              <div
                className="h-2 w-1/3 rounded-full bg-[var(--primary-strong)]"
                style={{ animation: "slide 1.4s linear infinite" }}
              />
            </div>
          </div>
        ) : null}

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: t("pages.daily.sales_count"), value: summary?.sales_count ?? "--", view: "sales" as ViewMode },
            { label: t("pages.daily.revenue"), value: summary?.revenue ?? "--", view: "sales" as ViewMode },
            { label: t("pages.daily.flags"), value: stats.flagsCount, view: "flags" as ViewMode },
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

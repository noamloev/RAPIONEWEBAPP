"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import { Branch, DailyRunStatus, DailySummary, FlagRow, SaleRow } from "@/lib/types";

function formatDateForApi(date: string) {
  return date;
}

function formatDateForLocalReceipts(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

type ViewMode = "sales" | "flags" | "runs";

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
  const today = new Date().toISOString().slice(0, 10);

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

  const [loading, setLoading] = useState(true);
  const [runningDaily, setRunningDaily] = useState(false);
  const [checkingReceipts, setCheckingReceipts] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const branchParam = selectedBranch === "All branches" ? undefined : selectedBranch;

  async function loadBranches() {
    const res = await onlineApi.get<Branch[]>("/branches");
    setBranches(res.data ?? []);
  }

  async function loadSummary() {
    const res = await onlineApi.get<DailySummary>("/report/daily", {
      params: {
        date_str: formatDateForApi(dateStr),
        ...(branchParam ? { branch: branchParam } : {}),
      },
    });
    setSummary(res.data);
  }

  async function loadSales() {
    const res = await onlineApi.get<SaleRow[]>("/report/sales", {
      params: {
        date_str: formatDateForApi(dateStr),
        ...(branchParam ? { branch: branchParam } : {}),
      },
    });
    setSales(res.data ?? []);
  }

  async function loadFlags() {
    const res = await onlineApi.get<FlagRow[]>("/report/flags", {
      params: {
        date_str: formatDateForApi(dateStr),
        ...(branchParam ? { branch: branchParam } : {}),
      },
    });
    setFlags(res.data ?? []);
  }

  async function loadRunStatuses() {
    const dt = new Date(dateStr);
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;

    const res = await onlineApi.get<DailyRunStatus[]>("/daily-runs/status", {
      params: { year, month },
    });
    setRunStatuses(res.data ?? []);
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
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load daily report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, selectedBranch]);

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
      if (!jobId) throw new Error("No job_id returned");

      setDailyJobId(jobId);
      setDailyJobStatus("running");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to start daily process");
      setRunningDaily(false);
    }
  }

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
          setSuccessMessage("Daily run completed.");
          await refreshAll();
        }

        if (data.status === "error") {
          clearInterval(timer);
          setRunningDaily(false);
          setError(data.error || "Daily run failed");
        }
      } catch (err: any) {
        clearInterval(timer);
        setRunningDaily(false);
        setError(err?.response?.data?.detail || err?.message || "Failed to fetch daily job status");
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyJobId]);

  async function handleCheckReceipts() {
    try {
      setCheckingReceipts(true);
      setError("");
      setSuccessMessage("");

      await localApi.post("/local/check-receipts", null, {
        params: {
          date_str: formatDateForLocalReceipts(dateStr),
        },
      });

      setSuccessMessage("Receipts check started. Telegram will be sent when finished.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to check receipts");
    } finally {
      setCheckingReceipts(false);
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

  const progressPercent = useMemo(() => {
    if (dailyJobStatus === "done") return 100;
    if (dailyJobStatus === "error") return 100;

    const rowLine = [...dailyProgressLines]
      .reverse()
      .find((line) => line.toLowerCase().includes("processing excel row"));

    if (!rowLine) return 0;

    const match = rowLine.match(/processing excel row\s+(\d+)\/(\d+)/i);
    if (!match) return 0;

    const current = Number(match[1]);
    const total = Number(match[2]);
    if (!total) return 0;

    return Math.min(100, Math.round((current / total) * 100));
  }, [dailyProgressLines, dailyJobStatus]);

  return (
    <PageShell title="Daily Report">
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

        <LuxuryCard
          title="Filters & Actions"
          description="Choose a date and branch, run the daily pipeline, or check receipts."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className={LuxuryInputClass()}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className={LuxuryInputClass()}
              >
                <option value="All branches">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
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
                Apply inventory changes
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
                Run Status: {selectedDateRunStatus}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleRunDaily}
              disabled={runningDaily}
              className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningDaily ? "Running..." : "Run Daily"}
            </button>

            <button
              onClick={handleCheckReceipts}
              disabled={checkingReceipts}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingReceipts ? "Checking..." : "Check Receipts"}
            </button>

            <button
              onClick={refreshAll}
              disabled={loading}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </LuxuryCard>

        {dailyJobId ? (
          <LuxuryCard title="Daily Run Progress">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-[var(--muted)]">
                  {dailyJobStatus === "done"
                    ? "Completed"
                    : dailyJobStatus === "error"
                    ? "Failed"
                    : "Running..."}
                </p>
              </div>

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

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted-strong)]">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>

              <div className="h-3 w-full rounded-full bg-[var(--accent)]">
                <div
                  className={`h-3 rounded-full transition-all ${
                    dailyJobStatus === "done"
                      ? "bg-emerald-500"
                      : dailyJobStatus === "error"
                      ? "bg-red-500"
                      : "bg-[var(--primary-strong)]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </LuxuryCard>
        ) : null}

        <div className="grid gap-4 md:grid-cols-5">
          {[
            { label: "Sales Count", value: summary?.sales_count ?? "--", view: "sales" as ViewMode },
            { label: "Revenue", value: summary?.revenue ?? "--", view: "sales" as ViewMode },
            { label: "Flags", value: stats.flagsCount, view: "flags" as ViewMode },
            { label: "CRIT Flags", value: stats.critCount, view: "flags" as ViewMode },
            { label: "Run Status", value: selectedDateRunStatus, view: "runs" as ViewMode },
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
              <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
                {item.value}
              </p>
            </button>
          ))}
        </div>

        {selectedView === "sales" ? (
          <LuxuryCard title="Sales" description="Loaded sales rows for the selected date.">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    {["Type", "Date", "Branch", "Invoice", "Customer", "Item", "Qty", "Unit Price", "Total"].map((col) => (
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
                        No sales rows.
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
                            {row.doc_date ? new Date(row.doc_date).toLocaleString() : "-"}
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

        {selectedView === "flags" ? (
          <LuxuryCard title="Flags" description="Warnings and critical audit flags for the selected date.">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    {["Severity", "Date", "Branch", "Item", "Invoice", "Reason"].map((col) => (
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
                        No flags.
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
                          {flag.flag_date ? new Date(flag.flag_date).toLocaleString() : "-"}
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

        {selectedView === "runs" ? (
          <LuxuryCard title="Run Statuses This Month" description="Daily run status history for the selected month.">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {runStatuses.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                  No run statuses.
                </div>
              ) : (
                runStatuses.map((status) => (
                  <div
                    key={status.date}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      status.status === "GREEN"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : status.status === "YELLOW"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-[var(--border)] bg-white text-[var(--muted-strong)]"
                    }`}
                  >
                    <div className="font-medium">{status.date}</div>
                    <div>{status.status}</div>
                  </div>
                ))
              )}
            </div>
          </LuxuryCard>
        ) : null}
      </div>
    </PageShell>
  );
}
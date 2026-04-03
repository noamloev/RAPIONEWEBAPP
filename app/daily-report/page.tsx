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
      if (!jobId) {
        throw new Error("No job_id returned");
      }

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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-rose-950">Filters & Actions</h3>
            <p className="text-sm text-rose-500">
              Choose a date and branch, run the daily pipeline, or check receipts.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-rose-800">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-rose-800">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
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
              <label className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm text-rose-800">
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
                className={`rounded-2xl px-4 py-3 font-medium ${
                  selectedDateRunStatus === "GREEN"
                    ? "bg-emerald-50 text-emerald-700"
                    : selectedDateRunStatus === "YELLOW"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-50 text-slate-600"
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
              className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningDaily ? "Running..." : "Run Daily"}
            </button>

            <button
              onClick={handleCheckReceipts}
              disabled={checkingReceipts}
              className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingReceipts ? "Checking..." : "Check Receipts"}
            </button>

            <button
              onClick={refreshAll}
              disabled={loading}
              className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {dailyJobId ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-rose-950">Daily Run Progress</h3>
                <p className="text-sm text-rose-500">
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
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {dailyJobStatus || "running"}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-rose-600">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>

              <div className="h-3 w-full rounded-full bg-rose-100">
                <div
                  className={`h-3 rounded-full transition-all ${
                    dailyJobStatus === "done"
                      ? "bg-emerald-500"
                      : dailyJobStatus === "error"
                      ? "bg-red-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-5">
          <button
            onClick={() => setSelectedView("sales")}
            className={`rounded-3xl border p-5 text-left shadow-sm transition ${
              selectedView === "sales"
                ? "border-rose-300 bg-rose-50"
                : "border-rose-200 bg-white hover:bg-rose-50/40"
            }`}
          >
            <p className="text-sm text-rose-500">Sales Count</p>
            <p className="mt-2 text-2xl font-semibold text-rose-950">
              {summary?.sales_count ?? "--"}
            </p>
          </button>

          <button
            onClick={() => setSelectedView("sales")}
            className={`rounded-3xl border p-5 text-left shadow-sm transition ${
              selectedView === "sales"
                ? "border-rose-300 bg-rose-50"
                : "border-rose-200 bg-white hover:bg-rose-50/40"
            }`}
          >
            <p className="text-sm text-rose-500">Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-rose-950">
              {summary?.revenue ?? "--"}
            </p>
          </button>

          <button
            onClick={() => setSelectedView("flags")}
            className={`rounded-3xl border p-5 text-left shadow-sm transition ${
              selectedView === "flags"
                ? "border-rose-300 bg-rose-50"
                : "border-rose-200 bg-white hover:bg-rose-50/40"
            }`}
          >
            <p className="text-sm text-rose-500">Flags</p>
            <p className="mt-2 text-2xl font-semibold text-rose-950">{stats.flagsCount}</p>
          </button>

          <button
            onClick={() => setSelectedView("flags")}
            className={`rounded-3xl border p-5 text-left shadow-sm transition ${
              selectedView === "flags"
                ? "border-rose-300 bg-rose-50"
                : "border-rose-200 bg-white hover:bg-rose-50/40"
            }`}
          >
            <p className="text-sm text-rose-500">CRIT Flags</p>
            <p className="mt-2 text-2xl font-semibold text-rose-950">{stats.critCount}</p>
          </button>

          <button
            onClick={() => setSelectedView("runs")}
            className={`rounded-3xl border p-5 text-left shadow-sm transition ${
              selectedView === "runs"
                ? "border-rose-300 bg-rose-50"
                : "border-rose-200 bg-white hover:bg-rose-50/40"
            }`}
          >
            <p className="text-sm text-rose-500">Run Status</p>
            <p className="mt-2 text-2xl font-semibold text-rose-950">
              {selectedDateRunStatus}
            </p>
          </button>
        </div>

        {selectedView === "sales" ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">Sales</h3>
              <p className="text-sm text-rose-500">
                Loaded sales rows for the selected date.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-rose-100">
              <table className="min-w-full divide-y divide-rose-100">
                <thead className="bg-rose-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 bg-white">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-rose-500">
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
                          : "hover:bg-rose-50/40";

                      return (
                        <tr key={row.line_key} className={rowClass}>
                          <td className="px-4 py-4 text-sm text-rose-700">{row.classification || "-"}</td>
                          <td className="px-4 py-4 text-sm text-rose-700">
                            {row.doc_date ? new Date(row.doc_date).toLocaleString() : "-"}
                          </td>
                          <td className="px-4 py-4 text-sm text-rose-800">{row.branch}</td>
                          <td className="px-4 py-4 text-sm text-rose-700">{row.invoice_no || "-"}</td>
                          <td className="px-4 py-4 text-sm text-rose-700">{row.customer_name || "-"}</td>
                          <td className="px-4 py-4 text-sm text-rose-800">{row.item_name}</td>
                          <td className="px-4 py-4 text-sm text-rose-700">{row.quantity}</td>
                          <td className="px-4 py-4 text-sm text-rose-700">{row.unit_price ?? "-"}</td>
                          <td className="px-4 py-4 text-sm text-rose-700">{row.total ?? "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {selectedView === "flags" ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">Flags</h3>
              <p className="text-sm text-rose-500">
                Warnings and critical audit flags for the selected date.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-rose-100">
              <table className="min-w-full divide-y divide-rose-100">
                <thead className="bg-rose-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 bg-white">
                  {flags.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-rose-500">
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
                            : "hover:bg-rose-50/40"
                        }
                      >
                        <td className="px-4 py-4 text-sm font-medium text-rose-800">{flag.severity}</td>
                        <td className="px-4 py-4 text-sm text-rose-700">
                          {flag.flag_date ? new Date(flag.flag_date).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-4 text-sm text-rose-700">{flag.branch || "-"}</td>
                        <td className="px-4 py-4 text-sm text-rose-800">{flag.item_name || "-"}</td>
                        <td className="px-4 py-4 text-sm text-rose-700">{flag.invoice_no || "-"}</td>
                        <td className="px-4 py-4 text-sm text-rose-700">{flag.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {selectedView === "runs" ? (
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">Run Statuses This Month</h3>
              <p className="text-sm text-rose-500">
                Daily run status history for the selected month.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {runStatuses.length === 0 ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-500">
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
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="font-medium">{status.date}</div>
                    <div>{status.status}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = [
  "#f9a8d4",
  "#f472b6",
  "#fb7185",
  "#fda4af",
  "#fbcfe8",
  "#fecdd3",
  "#fda4af",
  "#f9a8d4",
];

type SubjectMode = "consultants" | "leads";

type WorkerMonthlyStatsResponse = {
  year: number;
  month: number;
  subject: SubjectMode;
  is_final?: boolean;
  total_qty: number;
  total_success_count: number;
  workers: {
    worker_name: string;
    qty: number;
    success_count: number;
    percent_success?: number;
    items: {
      item_code: string;
      item_name: string;
      qty: number;
    }[];
  }[];
};

type WorkerMonthlyCacheResponse =
  | ({ found: false })
  | ({
      found: true;
      year: number;
      month: number;
      subject: SubjectMode;
      is_final?: boolean;
      total_qty: number;
      total_success_count: number;
      workers: WorkerMonthlyStatsResponse["workers"];
    });

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-rose-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-rose-950">{value}</p>
    </div>
  );
}

export default function WorkerStatisticsPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [subject, setSubject] = useState<SubjectMode>("consultants");

  const [data, setData] = useState<WorkerMonthlyStatsResponse | null>(null);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshAll() {
    try {
      setLoading(true);
      setError("");

      const [yearStr, monStr] = month.split("-");
      const year = Number(yearStr);
      const mon = Number(monStr);

      const now = new Date();
      const isClosedMonth =
        year < now.getFullYear() ||
        (year === now.getFullYear() && mon < now.getMonth() + 1);

      let payload: WorkerMonthlyStatsResponse | null = null;

      if (isClosedMonth) {
        try {
          const cacheRes = await onlineApi.get<WorkerMonthlyCacheResponse>("/worker-stats/monthly-cache", {
            params: { year, month: mon, subject },
          });

          if ("found" in cacheRes.data && cacheRes.data.found) {
            payload = {
              year: cacheRes.data.year,
              month: cacheRes.data.month,
              subject: cacheRes.data.subject,
              is_final: cacheRes.data.is_final,
              total_qty: cacheRes.data.total_qty,
              total_success_count: cacheRes.data.total_success_count,
              workers: cacheRes.data.workers,
            };
          }
        } catch {
          // fallback to local below
        }
      }

      if (!payload) {
        const res = await localApi.get<WorkerMonthlyStatsResponse>("/worker-stats/monthly", {
          params: { year, month: mon, subject },
        });
        payload = res.data;
      }

      setData(payload);
      const firstWorker = payload?.workers?.[0]?.worker_name || "";
      setSelectedWorker(firstWorker);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to load worker statistics");
    } finally {
      setLoading(false);
    }
  }

  const workers = data?.workers ?? [];

  const selectedWorkerData = useMemo(() => {
    return workers.find((w) => w.worker_name === selectedWorker) || null;
  }, [workers, selectedWorker]);

  const totalQty = data?.total_qty ?? 0;
  const totalSuccess = data?.total_success_count ?? 0;

  const topWorker = useMemo(() => {
    if (workers.length === 0) return "-";
    return workers[0]?.worker_name || "-";
  }, [workers]);

  const successPercent = totalQty > 0 ? Math.round((totalSuccess / totalQty) * 100) : 0;

  const pieData = useMemo(() => {
    return workers.map((row) => ({
      name: row.worker_name,
      value: Number(row.qty || 0),
    }));
  }, [workers]);

  const subjectLabel = subject === "consultants" ? "Consultants" : "Leads";

  return (
    <PageShell title="Worker Statistics">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-rose-950">Filters</h3>
              <p className="text-sm text-rose-500">
                Choose a month and whether to view consultants or leads, then press refresh.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-rose-800">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-rose-800">View</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as SubjectMode)}
                  className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                >
                  <option value="consultants">Consultants</option>
                  <option value="leads">Leads</option>
                </select>
              </div>

              <button
                onClick={refreshAll}
                disabled={loading}
                className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title={subject === "consultants" ? "Total Rows" : "Total Leads"} value={totalQty} />
          <SummaryCard title={subject === "consultants" ? "True / Closed Count" : "Success Count"} value={totalSuccess} />
          <SummaryCard title={subject === "consultants" ? "True %" : "Success %"} value={`${successPercent}%`} />
          <SummaryCard title={subject === "consultants" ? "Top Consultant" : "Top Lead Worker"} value={topWorker} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">{subjectLabel} Breakdown</h3>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-10 text-center text-sm text-rose-500">
                Loading chart...
              </div>
            ) : pieData.length === 0 ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-10 text-center text-sm text-rose-500">
                No data.
              </div>
            ) : (
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      innerRadius={55}
                      onClick={(data) => {
                        if (data?.name) setSelectedWorker(String(data.name));
                      }}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">{subjectLabel} Table</h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-rose-100">
              <table className="min-w-full divide-y divide-rose-100">
                <thead className="bg-rose-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                      {subject === "consultants" ? "Consultant" : "Lead Worker"}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Success</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rose-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 bg-white">
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-rose-500">
                        No rows found.
                      </td>
                    </tr>
                  ) : (
                    workers.map((row) => (
                      <tr
                        key={row.worker_name}
                        className={row.worker_name === selectedWorker ? "bg-rose-50" : "hover:bg-rose-50/40"}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-rose-900">{row.worker_name}</td>
                        <td className="px-4 py-4 text-sm text-rose-700">{row.qty}</td>
                        <td className="px-4 py-4 text-sm text-rose-700">{row.success_count}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedWorker(row.worker_name)}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-rose-950">
              {subject === "consultants" ? "True / False Breakdown" : "Status Breakdown"}
            </h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-rose-100">
            <table className="min-w-full divide-y divide-rose-100">
              <thead className="bg-rose-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50 bg-white">
                {!selectedWorkerData || selectedWorkerData.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-rose-500">
                      No details found.
                    </td>
                  </tr>
                ) : (
                  selectedWorkerData.items.map((row, idx) => (
                    <tr key={`${row.item_name}-${idx}`} className="hover:bg-rose-50/40">
                      <td className="px-4 py-4 text-sm font-medium text-rose-900">
                        {subject === "consultants" ? "Closed Flag" : "Lead Status"}
                      </td>
                      <td className="px-4 py-4 text-sm text-rose-800">{row.item_name}</td>
                      <td className="px-4 py-4 text-sm text-rose-700">{row.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
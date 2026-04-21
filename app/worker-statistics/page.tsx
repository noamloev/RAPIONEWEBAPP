"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/components/language-provider";

const PIE_COLORS = [
  "#6f314d",
  "#92506c",
  "#b56a87",
  "#c98aa1",
  "#dbc0cd",
  "#ead8e0",
  "#a85f7b",
  "#7f415d",
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

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/88 p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--primary-deep)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function WorkerStatisticsPage() {
  const { t } = useLanguage();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [subject, setSubject] = useState<SubjectMode>("consultants");

  const [data, setData] = useState<WorkerMonthlyStatsResponse | null>(null);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadedVia, setLoadedVia] = useState<"local" | "online" | "">("");

  function applyPayload(payload: WorkerMonthlyStatsResponse, via: "local" | "online") {
    setData(payload);
    setLoadedVia(via);
    const firstWorker = payload?.workers?.[0]?.worker_name || "";
    setSelectedWorker(firstWorker);
  }

  async function refreshFromLocal() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [yearStr, monStr] = month.split("-");
      const year = Number(yearStr);
      const mon = Number(monStr);
      const res = await localApi.get<WorkerMonthlyStatsResponse>("/worker-stats/monthly", {
        params: { year, month: mon, subject },
      });
      applyPayload(res.data, "local");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || t("pages.worker_stats.load_failed"));
    } finally {
      setLoading(false);
    }
  }

  async function refreshFromOnlineTest() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [yearStr, monStr] = month.split("-");
      const year = Number(yearStr);
      const mon = Number(monStr);

      const res = await onlineApi.get<WorkerMonthlyStatsResponse>("/worker-stats/monthly", {
        params: { year, month: mon, subject },
      });
      applyPayload(res.data, "online");
      setSuccess(
        t("pages.worker_stats.test_success")
          .replace("{subject}", subjectLabel)
          .replace("{count}", String(res.data?.total_qty ?? 0))
      );
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || t("pages.worker_stats.load_failed"));
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

  const subjectLabel =
    subject === "consultants"
      ? t("pages.worker_stats.consultants")
      : t("pages.worker_stats.leads");

  return (
    <PageShell title={t("pages.worker_stats.title")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
            {success}
          </div>
        ) : null}

        <Section title={t("pages.worker_stats.filters")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <p className="text-sm text-[var(--muted)]">
              {t("pages.worker_stats.filters_desc")}
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--primary-dark)]">
                  {t("pages.worker_stats.month")}
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--primary-dark)]">
                  {t("pages.worker_stats.view")}
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as SubjectMode)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                >
                  <option value="consultants">{t("pages.worker_stats.consultants")}</option>
                  <option value="leads">{t("pages.worker_stats.leads")}</option>
                </select>
              </div>

              <button
                onClick={refreshFromLocal}
                disabled={loading}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t("common.refreshing") : t("pages.worker_stats.get_button")}
              </button>

              <button
                onClick={refreshFromOnlineTest}
                disabled={loading}
                className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t("pages.worker_stats.test_running") : t("pages.worker_stats.test_button")}
              </button>
            </div>
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard
            title={subject === "consultants" ? t("pages.worker_stats.total_rows") : t("pages.worker_stats.total_leads")}
            value={totalQty}
          />
          <SummaryCard
            title={subject === "consultants" ? t("pages.worker_stats.true_closed_count") : t("pages.worker_stats.success_count")}
            value={totalSuccess}
          />
          <SummaryCard
            title={subject === "consultants" ? t("pages.worker_stats.true_percent") : t("pages.worker_stats.success_percent")}
            value={`${successPercent}%`}
          />
          <SummaryCard
            title={subject === "consultants" ? t("pages.worker_stats.top_consultant") : t("pages.worker_stats.top_lead_worker")}
            value={topWorker}
          />
          <SummaryCard
            title={t("pages.worker_stats.data_source")}
            value={
              loadedVia === "local"
                ? t("pages.worker_stats.source_local")
                : loadedVia === "online"
                ? t("pages.worker_stats.source_online")
                : "-"
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title={`${subjectLabel} ${t("pages.worker_stats.breakdown")}`}>
            {loading ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                {t("pages.worker_stats.loading_chart")}
              </div>
            ) : pieData.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                {t("pages.worker_stats.no_data")}
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
          </Section>

          <Section title={`${subjectLabel} ${t("pages.worker_stats.table")}`}>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                      {subject === "consultants" ? t("pages.worker_stats.consultant") : t("pages.worker_stats.lead_worker")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                      {t("table.total")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                      {t("table.success")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                      {t("table.action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-white">
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        {t("pages.worker_stats.no_rows")}
                      </td>
                    </tr>
                  ) : (
                    workers.map((row) => (
                      <tr
                        key={row.worker_name}
                        className={row.worker_name === selectedWorker ? "bg-[var(--card-soft)]" : "hover:bg-[var(--card-soft)]"}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">{row.worker_name}</td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.qty}</td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.success_count}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedWorker(row.worker_name)}
                            className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)]"
                          >
                            {t("pages.worker_stats.view_details")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <Section
          title={
            subject === "consultants"
              ? t("pages.worker_stats.true_false_breakdown")
              : t("pages.worker_stats.status_breakdown")
          }
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--card-soft)]">
                <tr>
                  {[t("table.type"), t("table.value"), t("table.count")].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {!selectedWorkerData || selectedWorkerData.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      {t("pages.worker_stats.no_details")}
                    </td>
                  </tr>
                ) : (
                  selectedWorkerData.items.map((row, idx) => (
                    <tr key={`${row.item_name}-${idx}`} className="hover:bg-[var(--card-soft)]">
                      <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">
                        {subject === "consultants"
                          ? t("pages.worker_stats.closed_flag")
                          : t("pages.worker_stats.lead_status")}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--foreground)]">{row.item_name}</td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </PageShell>
  );
}

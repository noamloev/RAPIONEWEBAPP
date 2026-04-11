"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { useLanguage } from "@/components/language-provider";

type InactiveClientRow = {
  customer_name: string;
  mobile: string;
  last_visit: string | null;
  days_since_last: number;
  total_visits: number;
  total_spent: number;
  last_branch: string;
};

type InactiveClientsResponse = {
  days: number;
  count: number;
  clients: InactiveClientRow[];
};

const PAGE_SIZE = 20;

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/88 p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">{value}</p>
    </div>
  );
}

function Section({
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

function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted)]">
        Page {page} of {totalPages}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[40px] rounded-xl px-3 py-2 text-sm font-semibold transition ${
              p === page
                ? "bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] text-white shadow-[0_10px_22px_rgba(159,79,114,0.24)]"
                : "border border-[var(--border)] bg-white text-[var(--primary-dark)] hover:bg-[var(--card-soft)]"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function FollowUpPage() {
  const { t } = useLanguage();

  const [data, setData] = useState<InactiveClientsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  async function refreshAll() {
    try {
      setLoading(true);
      setError("");

      const res = await onlineApi.get<InactiveClientsResponse>("/clients/inactive");
      setData(res.data);
      setPage(1);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || t("pages.follow_up.load_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clients = data?.clients ?? [];

  const avgDays = useMemo(() => {
    if (clients.length === 0) return 0;
    const total = clients.reduce((sum, c) => sum + (c.days_since_last || 0), 0);
    return Math.round(total / clients.length);
  }, [clients]);

  const totalSpent = useMemo(() => {
    return clients.reduce((sum, c) => sum + Number(c.total_spent || 0), 0).toFixed(2);
  }, [clients]);

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));

  const pagedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return clients.slice(start, start + PAGE_SIZE);
  }, [clients, page]);

  return (
    <PageShell title={t("pages.follow_up.title")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        <Section
          title={t("pages.follow_up.inactive_clients")}
          description={t("pages.follow_up.desc")}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div />
            <button
              onClick={refreshAll}
              disabled={loading}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("common.refreshing") : t("common.refresh")}
            </button>
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title={t("pages.follow_up.inactive_clients")} value={data?.count ?? 0} />
          <SummaryCard title={t("pages.follow_up.threshold_days")} value={data?.days ?? "-"} />
          <SummaryCard title={t("pages.follow_up.avg_days_since")} value={avgDays} />
          <SummaryCard title={t("pages.follow_up.total_spent")} value={totalSpent} />
        </div>

        <Section
          title={t("pages.follow_up.table_title")}
          description={t("pages.follow_up.table_desc")}
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--card-soft)]">
                <tr>
                  {[
                    t("table.name"),
                    t("table.mobile"),
                    t("table.last_visit"),
                    t("table.days_since_last"),
                    t("table.visits"),
                    t("table.total_spent"),
                    t("table.last_branch"),
                  ].map((col) => (
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
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      {t("pages.follow_up.no_clients")}
                    </td>
                  </tr>
                ) : (
                  pagedClients.map((row, idx) => (
                    <tr key={`${row.mobile}-${idx}`} className="hover:bg-[var(--card-soft)]">
                      <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">
                        {row.customer_name || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                        {row.mobile || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.last_visit ? new Date(row.last_visit).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.days_since_last}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.total_visits}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.total_spent}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.last_branch || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
        </Section>
      </div>
    </PageShell>
  );
}
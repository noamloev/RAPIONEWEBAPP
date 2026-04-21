"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { useLanguage } from "@/components/language-provider";

const PAGE_SIZE = 20;

type ClientRow = {
  id: number;
  full_name: string;
  mobile: string;
  branch_display: string;
  status_name: string;
  last_activity_at: string | null;
  total_amount: number;
};

type ClientsResponse = {
  count: number;
  clients: ClientRow[];
};

function getErrorMessage(err: unknown, fallback: string) {
  const maybeError = err as {
    message?: string;
    response?: { data?: { detail?: string } };
  };
  const detail = maybeError?.response?.data?.detail;
  return typeof detail === "string" ? detail : maybeError?.message || fallback;
}

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
        {description ? <p className="text-sm text-[var(--muted)]">{description}</p> : null}
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

  for (let i = start; i <= end; i++) pages.push(i);

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

export default function ClientsPage() {
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  async function loadClients(q?: string) {
    try {
      setLoading(true);
      setError("");

      const res = await onlineApi.get<ClientsResponse>("/clients", {
        params: q ? { q } : {},
      });

      setData(res.data);
      setPage(1);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("pages.clients.load_failed")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    await loadClients(search.trim());
  }

  const clients = useMemo(() => data?.clients ?? [], [data]);

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));

  const pagedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return clients.slice(start, start + PAGE_SIZE);
  }, [clients, page]);

  return (
    <PageShell title={t("pages.clients.title")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        <Section
          title={t("pages.clients.title")}
          description={t("pages.clients.desc")}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div />
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pages.clients.search_placeholder")}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
              />

              <button
                onClick={handleSearch}
                disabled={loading}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
              >
                {loading ? t("pages.clients.searching") : t("common.search")}
              </button>
            </div>
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-1">
          <SummaryCard title={t("pages.clients.clients_in_db")} value={data?.count ?? 0} />
        </div>

        <Section
          title={t("pages.clients.table_title")}
          description={t("pages.clients.table_desc")}
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--card-soft)]">
                <tr>
                  {[
                    t("table.full_name"),
                    t("table.phone"),
                    t("table.branch"),
                    t("table.status"),
                    t("table.last_payment_activity"),
                    t("table.total_amount"),
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
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      {t("pages.clients.no_clients")}
                    </td>
                  </tr>
                ) : (
                  pagedClients.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--card-soft)]">
                      <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">
                        {row.full_name || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                        {row.mobile || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.branch_display || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.status_name || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.last_activity_at
                          ? new Date(row.last_activity_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {row.total_amount}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";

const CLIENT_IMPORT_JOB_KEY = "rapidone_clients_import_job_id";
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

type ImportStatus = {
  ok: boolean;
  job_id: string;
  status: "queued" | "running" | "done" | "error";
  progress_lines: string[];
  scraped_count: number;
  current_page: number;
  uploading_page: number;
  created: number;
  updated: number;
  skipped: number;
  error: string | null;
  result: {
    count: number;
    created: number;
    updated: number;
    skipped: number;
    pages: number;
  } | null;
};

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
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [importJobId, setImportJobId] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedJobId = localStorage.getItem(CLIENT_IMPORT_JOB_KEY);
    if (savedJobId) {
      setImportJobId(savedJobId);
      setImporting(true);
    }
  }, []);

  async function handleSearch() {
    await loadClients(search.trim());
  }

  async function handleImportStart() {
    try {
      setImporting(true);
      setError("");
      setSuccess("");
      setImportStatus(null);
      setImportJobId("");

      const res = await localApi.post("/clients-import/start");
      const jobId = res.data?.job_id;

      if (!jobId) {
        throw new Error("No job_id returned");
      }

      setImportJobId(jobId);

      if (typeof window !== "undefined") {
        localStorage.setItem(CLIENT_IMPORT_JOB_KEY, jobId);
      }
    } catch (err: any) {
      setImporting(false);
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to start client import");
    }
  }

  useEffect(() => {
    if (!importJobId) return;

    const timer = setInterval(async () => {
      try {
        const res = await localApi.get<ImportStatus>("/clients-import/status", {
          params: { job_id: importJobId },
        });

        const payload = res.data;
        setImportStatus(payload);

        if (payload.status === "done") {
          clearInterval(timer);
          setImporting(false);

          if (typeof window !== "undefined") {
            localStorage.removeItem(CLIENT_IMPORT_JOB_KEY);
          }

          setSuccess(
            `Import finished. Scraped: ${payload.result?.count ?? 0}, Created: ${payload.result?.created ?? 0}, Updated: ${payload.result?.updated ?? 0}, Skipped: ${payload.result?.skipped ?? 0}.`
          );

          await loadClients(search.trim());
        }

        if (payload.status === "error") {
          clearInterval(timer);
          setImporting(false);

          if (typeof window !== "undefined") {
            localStorage.removeItem(CLIENT_IMPORT_JOB_KEY);
          }

          setError(payload.error || "Client import failed");
        }
      } catch (err: any) {
        clearInterval(timer);
        setImporting(false);

        const detail = err?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : err?.message || "Failed to fetch import status");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [importJobId, search]);

  const clients = data?.clients ?? [];

  const importPercent = useMemo(() => {
    if (!importStatus) return 0;
    if (importStatus.status === "done" || importStatus.status === "error") return 100;

    const currentPage = Number(importStatus.current_page || 0);
    const uploadedPage = Number(importStatus.uploading_page || 0);

    if (uploadedPage > 0) return Math.min(99, uploadedPage);
    if (currentPage > 0) return Math.min(99, currentPage);

    return 0;
  }, [importStatus]);

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));

  const pagedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return clients.slice(start, start + PAGE_SIZE);
  }, [clients, page]);

  return (
    <PageShell title="Clients">
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

        <Section
          title="Clients"
          description="Search clients, view core details, and import the latest active client list."
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div />
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
              />

              <button
                onClick={handleSearch}
                disabled={loading}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
              >
                {loading ? "Searching..." : "Search"}
              </button>

              <button
                onClick={handleImportStart}
                disabled={importing}
                className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {importing ? "Running Import..." : "Import Active Clients"}
              </button>
            </div>
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard title="Clients In DB" value={data?.count ?? 0} />
          <SummaryCard title="Scraped Count" value={importStatus?.scraped_count ?? 0} />
          <SummaryCard title="Current Page" value={importStatus?.current_page ?? 0} />
          <SummaryCard title="Uploading Page" value={importStatus?.uploading_page ?? 0} />
          <SummaryCard
            title="Created / Updated"
            value={`${importStatus?.created ?? 0} / ${importStatus?.updated ?? 0}`}
          />
        </div>

        {importJobId ? (
          <Section
            title="Import Progress"
            description="Scraping pages and uploading to the database in the background."
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div />
              <div
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  importStatus?.status === "done"
                    ? "bg-emerald-50 text-emerald-700"
                    : importStatus?.status === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-[var(--card-soft)] text-[var(--primary-dark)]"
                }`}
              >
                {importStatus?.status || "queued"}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted-strong)]">
                <span>Progress</span>
                <span>{importStatus?.status === "done" ? "100%" : `${importPercent}%`}</span>
              </div>

              <div className="h-3 w-full rounded-full bg-[var(--accent)]">
                <div
                  className={`h-3 rounded-full transition-all ${
                    importStatus?.status === "done"
                      ? "bg-emerald-500"
                      : importStatus?.status === "error"
                      ? "bg-red-500"
                      : "bg-[var(--primary-strong)]"
                  }`}
                  style={{
                    width:
                      importStatus?.status === "done"
                        ? "100%"
                        : `${Math.max(4, Math.min(importPercent, 99))}%`,
                  }}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="max-h-80 overflow-y-auto bg-[var(--card-soft)] px-4 py-3">
                <div className="space-y-2 text-sm text-[var(--foreground)]">
                  {(importStatus?.progress_lines ?? []).length === 0 ? (
                    <div>No progress yet.</div>
                  ) : (
                    importStatus?.progress_lines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Section>
        ) : null}

        <Section
          title="Clients Table"
          description="Main client details from the database."
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--card-soft)]">
                <tr>
                  {["Full Name", "Phone", "Branch", "Status", "Last Payment / Activity", "Total Amount"].map((col) => (
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
                      No clients found.
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
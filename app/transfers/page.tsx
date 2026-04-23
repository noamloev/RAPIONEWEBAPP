"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import {
  DataTable,
  SecondaryButton,
  SectionCard,
  SelectInput,
  SummaryCard,
} from "@/components/ui-kit";
import { onlineApi } from "@/lib/api-online";
import { TransferRow } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

type Branch = { id: number; name: string };

const MOCK_TRANSFERS: TransferRow[] = [
  {
    id: "mock-1",
    from_branch_name: "Main Warehouse",
    to_branch_name: "Tel Aviv Branch",
    status: "IN_TRANSIT",
    created_at: "2024-01-15T10:00:00",
    line_count: 3,
    lines: [
      { item_code: "SKU-1", item_name: "Serum", qty: 2 },
      { item_code: "SKU-2", item_name: "Mask", qty: 1 },
    ],
  },
  {
    id: "mock-2",
    from_branch_name: "Main Warehouse",
    to_branch_name: "Haifa Branch",
    status: "RECEIVED",
    created_at: "2024-01-14T08:30:00",
    line_count: 1,
    lines: [{ item_code: "SKU-3", item_name: "Cleanser", qty: 1 }],
  },
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
};

const STATUS_KEY: Record<string, string> = {
  DRAFT: "pages.transfers.status_draft",
  IN_TRANSIT: "pages.transfers.status_in_transit",
  RECEIVED: "pages.transfers.status_received",
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function TransfersPage() {
  const { t } = useLanguage();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  async function loadTransfers() {
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_TRANSFERS === "true";
    if (useMock) {
      setRows(MOCK_TRANSFERS);
      return;
    }

    const params: Record<string, string> = {};
    if (selectedBranch) params.branch_name = selectedBranch;
    if (selectedStatus) params.status = selectedStatus;

    const res = await onlineApi.get<TransferRow[]>("/transfers/pending", {
      params,
    });
    setRows(res.data ?? []);
  }

  async function loadBranches() {
    const res = await onlineApi.get<Branch[]>("/branches");
    setBranches(res.data ?? []);
  }

  async function refreshAll() {
    try {
      setLoading(true);
      setError("");
      await loadBranches();
      await loadTransfers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (err as { message?: string })?.message ||
        t("pages.transfers.load_failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadTransfers().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, selectedStatus]);

  const draftCount = rows.filter((r) => r.status === "DRAFT").length;
  const inTransitCount = rows.filter((r) => r.status === "IN_TRANSIT").length;
  const receivedCount = rows.filter((r) => r.status === "RECEIVED").length;

  return (
    <PageShell title={t("pages.transfers.title")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title={t("pages.transfers.total")} value={rows.length} />
          <SummaryCard title={t("pages.transfers.pending_draft")} value={draftCount} />
          <SummaryCard title={t("pages.transfers.in_transit")} value={inTransitCount} />
          <SummaryCard title={t("pages.transfers.status_received")} value={receivedCount} />
        </div>

        <SectionCard
          title={t("pages.transfers.title")}
          description={t("pages.transfers.desc")}
        >
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[220px]">
              <SelectInput
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">{t("pages.transfers.all_branches")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="min-w-[180px]">
              <SelectInput
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">{t("pages.transfers.all_statuses")}</option>
                <option value="DRAFT">{t("pages.transfers.pending_draft")}</option>
                <option value="IN_TRANSIT">{t("pages.transfers.in_transit")}</option>
                <option value="RECEIVED">{t("pages.transfers.status_received")}</option>
              </SelectInput>
            </div>

            <SecondaryButton onClick={refreshAll} disabled={loading}>
              {t("common.refresh")}
            </SecondaryButton>
          </div>
        </SectionCard>

        <SectionCard
          title={t("pages.transfers.title")}
          description={t("pages.transfers.desc")}
        >
          <DataTable
            columns={[
              t("table.transfer_id"),
              t("table.from_branch"),
              t("table.to_branch"),
              t("table.status"),
              t("table.line_count"),
              t("table.inventory_moved"),
              t("table.created_at"),
            ]}
          >
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                >
                  {loading ? t("common.loading") : t("pages.transfers.empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--card-soft)]">
                  <td className="px-4 py-4 font-mono text-xs text-[var(--muted-strong)]">
                    {row.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {row.from_branch_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {row.to_branch_name}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      status={row.status}
                      label={t(STATUS_KEY[row.status] ?? "pages.transfers.status_draft")}
                    />
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {row.line_count}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    <div className="space-y-1">
                      {row.lines.length === 0 ? (
                        <span className="text-[var(--muted)]">-</span>
                      ) : (
                        row.lines.map((line) => (
                          <div key={`${row.id}-${line.item_code}`} className="text-xs leading-5">
                            <span className="font-medium">{line.item_name}</span>{" "}
                            <span className="text-[var(--muted)]">({line.item_code}) x{line.qty}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </SectionCard>
      </div>
    </PageShell>
  );
}

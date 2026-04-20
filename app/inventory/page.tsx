"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import {
  DataTable,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SummaryCard,
  SelectInput,
  TextInput,
} from "@/components/ui-kit";
import { onlineApi } from "@/lib/api-online";
import { useLanguage } from "@/components/language-provider";

type Branch = { id: number; name: string };

type Product = {
  item_code: string;
  item_name: string;
};

type CtpInputRow = { item_code: string; amount_at_date: string; date_str: string };

type CtpResultRow = {
  ok: boolean;
  item_code: string;
  branch: string;
  sold_since?: number;
  old_qty?: number;
  new_qty?: number;
  action_group_id?: string;
  error?: string;
};

type InventoryRow = {
  branch?: string;
  item_code: string;
  item_name: string;
  qty: number;
};

type InventoryHistoryRow = {
  action_group_id: string;
  created_at: string | null;
  change_type: string;
  source: string;
  branch_name: string;
  product_code: string;
  product_name: string;
  old_qty: number;
  new_qty: number;
  qty_delta: number;
  related_branch_name: string | null;
  is_reverted: boolean;
};

export default function InventoryPage() {
  const { t } = useLanguage();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [setProductCode, setSetProductCode] = useState("");
  const [setQty, setSetQty] = useState("");
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [savingBranchOnly, setSavingBranchOnly] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [undoPreviewRows, setUndoPreviewRows] = useState<InventoryHistoryRow[] | null>(null);
  const [undoPreviewActionGroupId, setUndoPreviewActionGroupId] = useState<string | null>(null);
  const [undoModalOpen, setUndoModalOpen] = useState(false);

  // Change the Past modal state
  const [ctpModalOpen, setCtpModalOpen] = useState(false);

  const [ctpRows, setCtpRows] = useState<CtpInputRow[]>([
    { item_code: "", amount_at_date: "", date_str: "" },
  ]);
  const [ctpResults, setCtpResults] = useState<CtpResultRow[] | null>(null);
  const [ctpRunning, setCtpRunning] = useState(false);

  async function loadBranches() {
    const res = await onlineApi.get<Branch[]>("/branches");
    const data = res.data ?? [];
    setBranches(data);

    if (!selectedBranch && data.length > 0) {
      setSelectedBranch(data[0].name);
    }
  }

  async function loadProducts() {
    const res = await onlineApi.get<Product[]>("/products");
    const data = res.data ?? [];
    setProducts(data);

    if (!setProductCode && data.length > 0) {
      setSetProductCode(data[0].item_code);
    }
  }

  async function loadInventory(branchName?: string) {
    const target = branchName || selectedBranch;
    if (!target) return;

    const res = await onlineApi.get<InventoryRow[]>("/inventory", {
      params: { branch: target },
    });
    setRows(res.data ?? []);
  }

  async function refreshAll(branchName?: string) {
    try {
      setLoading(true);
      setError("");
      await loadBranches();
      await loadProducts();
      await loadInventory(branchName);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || t("pages.inventory.load_failed")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadInventory(selectedBranch).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  async function setInventoryWithWarehouse() {
    try {
      setSavingWarehouse(true);
      setError("");
      setSuccess("");

      await onlineApi.post("/inventory/set_with_warehouse", {
        branch: selectedBranch,
        item_code: setProductCode,
        qty: Number(setQty || 0),
      });

      setSuccess(t("pages.inventory.success_with_warehouse"));
      setSetQty("");
      await loadInventory();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.inventory.save_with_warehouse_failed")
      );
    } finally {
      setSavingWarehouse(false);
    }
  }

  async function setInventoryBranchOnly() {
    try {
      setSavingBranchOnly(true);
      setError("");
      setSuccess("");

      await onlineApi.post("/inventory/set_branch_only", {
        branch: selectedBranch,
        item_code: setProductCode,
        qty: Number(setQty || 0),
      });

      setSuccess(t("pages.inventory.success_branch_only"));
      setSetQty("");
      await loadInventory();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.inventory.save_branch_only_failed")
      );
    } finally {
      setSavingBranchOnly(false);
    }
  }

  async function openUndoPreview() {
    try {
      setError("");
      setSuccess("");

      const historyRes = await onlineApi.get<InventoryHistoryRow[]>("/inventory/history", {
        params: { limit: 100 },
      });

      const history = historyRes.data ?? [];

      const latestForBranch = history.find(
        (row) => row.branch_name === selectedBranch && !row.is_reverted
      );

      if (!latestForBranch) {
        setError(t("pages.inventory.no_undoable_change"));
        return;
      }

      const groupRows = history.filter(
        (row) =>
          row.action_group_id === latestForBranch.action_group_id && !row.is_reverted
      );

      setUndoPreviewRows(groupRows);
      setUndoPreviewActionGroupId(latestForBranch.action_group_id);
      setUndoModalOpen(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.inventory.undo_preview_failed")
      );
    }
  }

  async function confirmUndo() {
    if (!undoPreviewActionGroupId) return;

    try {
      setUndoing(true);
      setError("");
      setSuccess("");

      await onlineApi.post("/inventory/undo", {
        action_group_id: undoPreviewActionGroupId,
      });

      setSuccess(t("pages.inventory.undo_success"));
      setUndoModalOpen(false);
      setUndoPreviewRows(null);
      setUndoPreviewActionGroupId(null);
      await loadInventory();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.inventory.undo_failed")
      );
    } finally {
      setUndoing(false);
    }
  }

  function closeUndoModal() {
    if (undoing) return;
    setUndoModalOpen(false);
    setUndoPreviewRows(null);
    setUndoPreviewActionGroupId(null);
  }

  const undoRowsSorted = useMemo(() => undoPreviewRows ?? [], [undoPreviewRows]);

  function openCtpModal() {
    setCtpRows([{ item_code: "", amount_at_date: "", date_str: "" }]);
    setCtpResults(null);
    setCtpModalOpen(true);
  }

  function closeCtpModal() {
    if (ctpRunning) return;
    setCtpModalOpen(false);
    setCtpResults(null);
  }

  function ctpAddRow() {
    setCtpRows((prev) => [...prev, { item_code: "", amount_at_date: "", date_str: "" }]);
  }

  function ctpRemoveRow(idx: number) {
    setCtpRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function ctpUpdateRow(idx: number, field: keyof CtpInputRow, value: string) {
    setCtpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function runCtpModal() {
    try {
      setCtpRunning(true);
      setError("");
      setSuccess("");
      setCtpResults(null);

      const validRows = ctpRows.filter((r) => r.item_code && r.amount_at_date && r.date_str);
      if (validRows.length === 0) return;

      const res = await onlineApi.post<CtpResultRow[]>("/inventory/change-past", {
        rows: validRows.map((r) => ({
          item_code: r.item_code,
          branch: selectedBranch,
          amount_at_date: Number(r.amount_at_date),
          date_str: r.date_str,
        })),
      });

      setCtpResults(res.data ?? []);
      const anyOk = (res.data ?? []).some((r) => r.ok);
      if (anyOk) {
        setSuccess(t("pages.inventory.ctp_success"));
        await loadInventory();
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || t("pages.inventory.ctp_failed")
      );
    } finally {
      setCtpRunning(false);
    }
  }

  return (
    <PageShell title={t("pages.inventory.title")}>
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

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title={t("pages.inventory.rows_loaded")} value={rows.length} />
          <SummaryCard title={t("pages.inventory.selected_branch")} value={selectedBranch || "-"} />
          <SummaryCard
            title={t("pages.inventory.status")}
            value={loading ? t("common.loading") : t("shell.ready")}
          />
          <SummaryCard
            title={t("pages.inventory.undo_state")}
            value={
              undoing
                ? t("pages.inventory.undoing")
                : undoModalOpen
                ? t("pages.inventory.confirming")
                : t("pages.inventory.available")
            }
          />
        </div>

        <SectionCard
          title={t("pages.inventory.branch_view")}
          description={t("pages.inventory.branch_view_desc")}
        >
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[260px]">
              <SelectInput
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            </div>

            <SecondaryButton onClick={() => refreshAll(selectedBranch)} disabled={loading}>
              {t("common.refresh")}
            </SecondaryButton>

            <SecondaryButton
              onClick={openUndoPreview}
              disabled={!selectedBranch || undoing}
              className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              {undoing ? t("pages.inventory.undoing") : t("pages.inventory.undo_last_change")}
            </SecondaryButton>

            <SecondaryButton
              onClick={openCtpModal}
              disabled={!selectedBranch}
              className="border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
            >
              {t("pages.inventory.change_the_past")}
            </SecondaryButton>

          </div>
        </SectionCard>

        <SectionCard
          title={t("pages.inventory.set_inventory")}
          description={t("pages.inventory.set_inventory_desc")}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <SelectInput
              value={setProductCode}
              onChange={(e) => setSetProductCode(e.target.value)}
            >
              <option value="">{t("pages.inventory.select_product")}</option>
              {products.map((p) => (
                <option key={p.item_code} value={p.item_code}>
                  {p.item_name} ({p.item_code})
                </option>
              ))}
            </SelectInput>

            <TextInput
              placeholder={t("pages.inventory.quantity")}
              type="number"
              value={setQty}
              onChange={(e) => setSetQty(e.target.value)}
            />

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <PrimaryButton
                onClick={setInventoryWithWarehouse}
                disabled={
                  savingWarehouse || savingBranchOnly || !selectedBranch || !setProductCode
                }
              >
                {savingWarehouse
                  ? t("pages.inventory.saving")
                  : t("pages.inventory.set_with_warehouse")}
              </PrimaryButton>

              <SecondaryButton
                onClick={setInventoryBranchOnly}
                disabled={
                  savingWarehouse || savingBranchOnly || !selectedBranch || !setProductCode
                }
              >
                {savingBranchOnly
                  ? t("pages.inventory.saving")
                  : t("pages.inventory.set_branch_only")}
              </SecondaryButton>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("pages.inventory.table_title")}
          description={t("pages.inventory.table_desc")}
        >
          <DataTable
            columns={[
              t("table.code"),
              t("table.product"),
              t("table.qty"),
            ]}
          >
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  {t("pages.inventory.empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.item_code}-${row.item_name}`}
                  className="hover:bg-[var(--card-soft)]"
                >
                  <td className="px-4 py-4 text-sm font-medium text-[var(--primary-dark)]">
                    {row.item_code}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {row.item_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {row.qty}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </SectionCard>

        {ctpModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-4xl rounded-3xl border border-violet-200 bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-violet-950">
                  {t("pages.inventory.ctp_title")}
                </h2>
                <p className="mt-1 text-sm text-violet-500">
                  {t("pages.inventory.ctp_desc")}
                </p>
                <p className="mt-1 text-xs text-violet-400">
                  {t("pages.inventory.selected_branch")}: <strong>{selectedBranch}</strong>
                </p>
              </div>

              <div className="space-y-3 mb-4">
                {ctpRows.map((row, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-center">
                    <div className="flex-1 min-w-[180px]">
                      <select
                        className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        value={row.item_code}
                        onChange={(e) => ctpUpdateRow(idx, "item_code", e.target.value)}
                      >
                        <option value="">{t("pages.inventory.ctp_product")}</option>
                        {products.map((p) => (
                          <option key={p.item_code} value={p.item_code}>
                            {p.item_name} ({p.item_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="w-28 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      placeholder={t("pages.inventory.ctp_amount")}
                      value={row.amount_at_date}
                      onChange={(e) => ctpUpdateRow(idx, "amount_at_date", e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-36 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      placeholder={t("pages.inventory.ctp_date")}
                      value={row.date_str}
                      onChange={(e) => ctpUpdateRow(idx, "date_str", e.target.value)}
                    />
                    {ctpResults && ctpResults[idx] ? (
                      <span
                        className={`text-xs px-2 py-1 rounded-lg ${
                          ctpResults[idx].ok
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {ctpResults[idx].ok
                          ? `${t("pages.inventory.ctp_sold_since")}: ${ctpResults[idx].sold_since} → ${t("pages.inventory.ctp_new_qty")}: ${ctpResults[idx].new_qty}`
                          : ctpResults[idx].error}
                      </span>
                    ) : null}
                    {ctpRows.length > 1 ? (
                      <button
                        onClick={() => ctpRemoveRow(idx)}
                        disabled={ctpRunning}
                        className="text-xs text-red-400 hover:text-red-600 px-2"
                      >
                        {t("pages.inventory.ctp_remove")}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-2 mb-5">
                <button
                  onClick={ctpAddRow}
                  disabled={ctpRunning}
                  className="text-sm text-violet-600 hover:text-violet-800 underline"
                >
                  + {t("pages.inventory.ctp_add_row")}
                </button>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <SecondaryButton onClick={closeCtpModal} disabled={ctpRunning}>
                  {t("common.cancel")}
                </SecondaryButton>
                <PrimaryButton
                  onClick={runCtpModal}
                  disabled={ctpRunning || !selectedBranch}
                  className="bg-violet-600 hover:bg-violet-700 border-violet-700"
                >
                  {ctpRunning ? t("pages.inventory.ctp_running") : t("pages.inventory.ctp_run")}
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}

        {undoModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-3xl rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-rose-950">
                  {t("pages.inventory.confirm_undo")}
                </h2>
                <p className="mt-1 text-sm text-rose-500">
                  {t("pages.inventory.confirm_undo_desc")}
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-rose-100">
                <table className="min-w-full divide-y divide-rose-100">
                  <thead className="bg-rose-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                        {t("table.branch")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                        {t("table.product")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                        {t("table.change_type")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                        {t("table.current_qty")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                        {t("table.will_revert_to")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50 bg-white">
                    {undoRowsSorted.map((row, idx) => (
                      <tr key={`${row.action_group_id}-${row.branch_name}-${row.product_code}-${idx}`}>
                        <td className="px-4 py-4 text-sm text-rose-800">
                          {row.branch_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-rose-800">
                          {row.product_name} {row.product_code ? `(${row.product_code})` : ""}
                        </td>
                        <td className="px-4 py-4 text-sm text-rose-700">
                          {row.change_type}
                        </td>
                        <td className="px-4 py-4 text-sm text-rose-700">
                          {row.new_qty}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-rose-900">
                          {row.old_qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <SecondaryButton onClick={closeUndoModal} disabled={undoing}>
                  {t("common.cancel")}
                </SecondaryButton>

                <PrimaryButton onClick={confirmUndo} disabled={undoing}>
                  {undoing ? t("pages.inventory.undoing") : t("pages.inventory.yes_undo_changes")}
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
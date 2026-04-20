"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { Product } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

type ProductCreatePayload = {
  item_code: string;
  item_name: string;
  active: number;
  base_price?: number | null;
  currency: string;
};

type AliasRow = { alias_code: string; alias_name: string };

export default function ProductsPage() {
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Add Custom Product modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customMainCode, setCustomMainCode] = useState("");
  const [customMainName, setCustomMainName] = useState("");
  const [customBasePrice, setCustomBasePrice] = useState("");
  const [customAliases, setCustomAliases] = useState<AliasRow[]>([{ alias_code: "", alias_name: "" }]);
  const [customSaving, setCustomSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [basePrice, setBasePrice] = useState("");

  function openCustomModal() {
    setCustomMainCode("");
    setCustomMainName("");
    setCustomBasePrice("");
    setCustomAliases([{ alias_code: "", alias_name: "" }]);
    setCustomModalOpen(true);
  }

  function customAddAlias() {
    setCustomAliases((prev) => [...prev, { alias_code: "", alias_name: "" }]);
  }

  function customRemoveAlias(idx: number) {
    setCustomAliases((prev) => prev.filter((_, i) => i !== idx));
  }

  function customUpdateAlias(idx: number, field: keyof AliasRow, value: string) {
    setCustomAliases((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function saveCustomProduct() {
    if (!customMainCode.trim() || !customMainName.trim()) {
      setError(t("pages.inventory.custom_failed") + ": code and name are required");
      return;
    }
    try {
      setCustomSaving(true);
      setError("");
      setSuccess("");
      const aliases = customAliases.filter((a) => a.alias_code.trim());
      await onlineApi.post("/product-aliases/create-group", {
        main_code: customMainCode.trim(),
        main_name: customMainName.trim(),
        base_price: customBasePrice ? Number(customBasePrice) : null,
        aliases,
      });
      setSuccess(t("pages.inventory.custom_success"));
      setCustomModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || t("pages.inventory.custom_failed"));
    } finally {
      setCustomSaving(false);
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const res = await onlineApi.get<Product[]>("/products");
      setProducts(res.data ?? []);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.products.load_failed")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!itemCode.trim() || !itemName.trim()) {
      setError(t("pages.products.required_fields"));
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: ProductCreatePayload = {
        item_code: itemCode.trim(),
        item_name: itemName.trim(),
        active: 1,
        base_price: basePrice.trim() === "" ? null : Number(basePrice),
        currency: "ILS",
      };

      await onlineApi.post("/products", payload);

      setItemCode("");
      setItemName("");
      setBasePrice("");
      await loadProducts();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.products.add_failed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(itemNameToDelete: string) {
    const ok = window.confirm(
      t("pages.products.deactivate_confirm").replace(
        "{name}",
        itemNameToDelete
      )
    );
    if (!ok) return;

    try {
      setError("");
      await onlineApi.delete(
        `/products/by-name/${encodeURIComponent(itemNameToDelete)}`
      );
      await loadProducts();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          t("pages.products.delete_failed")
      );
    }
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      return (
        p.item_code?.toLowerCase().includes(q) ||
        p.item_name?.toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  return (
    <PageShell title={t("pages.products.title")}>
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

        <section className="rounded-[30px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--primary-deep)]">
              {t("pages.products.add_product")}
            </h3>
            <p className="text-sm text-[var(--muted)]">
              {t("pages.products.add_product_desc")}
            </p>
          </div>

          <form onSubmit={handleAddProduct} className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">
                {t("pages.products.item_code")}
              </label>
              <input
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                placeholder={t("pages.products.item_code_placeholder")}
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">
                {t("pages.products.item_name")}
              </label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                placeholder={t("pages.products.item_name_placeholder")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--primary-dark)]">
                {t("pages.products.base_price")}
              </label>
              <input
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? t("pages.products.adding")
                  : t("pages.products.add_product")}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[30px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--primary-deep)]">
                {t("pages.products.list_title")}
              </h3>
              <p className="text-sm text-[var(--muted)]">
                {t("pages.products.list_desc")}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                placeholder={t("pages.products.search_placeholder")}
              />

              <button
                onClick={loadProducts}
                disabled={loading}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? t("common.refreshing") : t("common.refresh")}
              </button>

              <button
                onClick={openCustomModal}
                className="rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
              >
                {t("pages.inventory.add_custom")}
              </button>
            </div>
          </div>


          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--card-soft)]">
                <tr>
                  {[
                    t("table.code"),
                    t("table.name"),
                    t("table.barcode"),
                    t("table.base_price"),
                    t("table.currency"),
                    t("table.actions"),
                  ].map((col) => (
                    <th
                      key={col}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)] ${
                        col === t("table.actions") ? "text-right" : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)] bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                      {t("pages.products.loading")}
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                      {t("pages.products.empty")}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[var(--card-soft)]">
                      <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">
                        {product.item_code}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                        {product.item_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {product.barcode || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                        {product.base_price ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">
                        {product.currency || "ILS"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDeleteProduct(product.item_name)}
                          className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)]"
                        >
                          {t("pages.products.deactivate")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        {customModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-2xl rounded-3xl border border-teal-200 bg-white p-6 shadow-2xl">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-teal-950">
                  {t("pages.inventory.custom_title")}
                </h2>
                <p className="mt-1 text-sm text-teal-500">
                  {t("pages.inventory.custom_desc")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3 mb-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-teal-700">
                    {t("pages.inventory.custom_main_code")} *
                  </label>
                  <input
                    className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                    value={customMainCode}
                    onChange={(e) => setCustomMainCode(e.target.value)}
                    placeholder="e.g. HALLURA"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-teal-700">
                    {t("pages.inventory.custom_main_name")} *
                  </label>
                  <input
                    className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                    value={customMainName}
                    onChange={(e) => setCustomMainName(e.target.value)}
                    placeholder="e.g. Hallura"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-teal-700">
                    {t("pages.inventory.custom_base_price")}
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                    value={customBasePrice}
                    onChange={(e) => setCustomBasePrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                  {t("pages.inventory.custom_aliases")}
                </p>
                <div className="space-y-2">
                  {customAliases.map((alias, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        className="flex-1 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                        placeholder={t("pages.inventory.custom_alias_code")}
                        value={alias.alias_code}
                        onChange={(e) => customUpdateAlias(idx, "alias_code", e.target.value)}
                      />
                      <input
                        className="flex-1 rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                        placeholder={t("pages.inventory.custom_alias_name")}
                        value={alias.alias_name}
                        onChange={(e) => customUpdateAlias(idx, "alias_name", e.target.value)}
                      />
                      {customAliases.length > 1 ? (
                        <button
                          onClick={() => customRemoveAlias(idx)}
                          className="text-xs text-red-400 hover:text-red-600 px-2 shrink-0"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  onClick={customAddAlias}
                  className="mt-2 text-sm text-teal-600 hover:text-teal-800 underline"
                >
                  + {t("pages.inventory.custom_add_alias")}
                </button>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => setCustomModalOpen(false)}
                  disabled={customSaving}
                  className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={saveCustomProduct}
                  disabled={customSaving || !customMainCode.trim() || !customMainName.trim()}
                  className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {customSaving ? t("pages.inventory.custom_saving") : t("pages.inventory.custom_save")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
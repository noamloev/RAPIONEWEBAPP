"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { Product } from "@/lib/types";

type ProductCreatePayload = {
  item_code: string;
  item_name: string;
  active: number;
  base_price?: number | null;
  currency: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [search, setSearch] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [basePrice, setBasePrice] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const res = await onlineApi.get<Product[]>("/products");
      setProducts(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!itemCode.trim() || !itemName.trim()) {
      setError("Item code and item name are required.");
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
      setError(err?.response?.data?.detail || err?.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(itemNameToDelete: string) {
    const ok = window.confirm(`Deactivate "${itemNameToDelete}"?`);
    if (!ok) return;

    try {
      setError("");
      await onlineApi.delete(`/products/by-name/${encodeURIComponent(itemNameToDelete)}`);
      await loadProducts();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete product");
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
    <PageShell title="Products">
      <div className="space-y-6">
        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-rose-950">Add Product</h3>
            <p className="text-sm text-rose-500">
              Add a new product to the company catalog.
            </p>
          </div>

          <form
            onSubmit={handleAddProduct}
            className="grid gap-4 md:grid-cols-4"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-rose-800">Item Code</label>
              <input
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                placeholder="e.g. HALLURA-1"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-rose-800">Item Name</label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                placeholder="Product name"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-rose-800">Base Price</label>
              <input
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add Product"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-rose-950">Products List</h3>
              <p className="text-sm text-rose-500">
                Browse, search, and manage active products.
              </p>
            </div>

            <div className="flex gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72 rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                placeholder="Search by code, name, barcode..."
              />

              <button
                onClick={loadProducts}
                disabled={loading}
                className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-rose-100">
            <table className="min-w-full divide-y divide-rose-100">
              <thead className="bg-rose-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Base Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Currency
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rose-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-rose-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-rose-500">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-rose-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-rose-50/40">
                      <td className="px-4 py-4 text-sm font-medium text-rose-900">
                        {product.item_code}
                      </td>
                      <td className="px-4 py-4 text-sm text-rose-800">
                        {product.item_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-rose-600">
                        {product.barcode || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-rose-800">
                        {product.base_price ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-rose-600">
                        {product.currency || "ILS"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDeleteProduct(product.item_name)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                        >
                          Deactivate
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
    </PageShell>
  );
}
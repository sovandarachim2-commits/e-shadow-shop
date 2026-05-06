"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Truck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";
import { Product } from "@/lib/types";
import { money } from "@/lib/format";

export default function AdminDeliveryPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [products, setProducts] = useState<Product[]>([]);
  const [productVisibility, setProductVisibility] = useState<Record<string, boolean>>({});
  const [productLabels, setProductLabels] = useState<Record<string, string>>({});
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const headers = useCallback((): HeadersInit => {
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, [token]);

  function getDefaultDeliveryLabel(product: Product) {
    return money(product.deliveryFee || 0);
  }

  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]));

    fetch("/api/settings/delivery-display")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setProductVisibility(data.deliveryDisplay?.productVisibility || {});
        setProductLabels(data.deliveryDisplay?.productLabels || {});
      })
      .catch(() => {
        setProductVisibility({});
        setProductLabels({});
      });
  }, []);

  async function saveDeliveryDisplay(nextVisibility: Record<string, boolean>, nextLabels = productLabels) {
    setSavingDisplay(true);
    const response = await fetch("/api/settings/delivery-display", {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ productVisibility: nextVisibility, productLabels: nextLabels })
    });
    setSavingDisplay(false);
    if (!response.ok) return toast("Could not save delivery display setting", "error");
    setProductVisibility(nextVisibility);
    setProductLabels(nextLabels);
    toast("Delivery display setting updated");
  }

  async function toggleProductVisibility(productId: string, checked: boolean) {
    const nextVisibility = { ...productVisibility, [productId]: checked };
    setProductVisibility(nextVisibility);
    await saveDeliveryDisplay(nextVisibility);
  }

  function startEditLabel(product: Product) {
    setEditingProduct(product);
    setLabelDraft(productLabels[product.id] || getDefaultDeliveryLabel(product));
  }

  function cancelEditLabel() {
    setEditingProduct(null);
    setLabelDraft("");
  }

  async function saveProductLabel() {
    if (!editingProduct) return;
    const nextLabel = labelDraft.trim() || getDefaultDeliveryLabel(editingProduct);
    const nextLabels = { ...productLabels, [editingProduct.id]: nextLabel };
    setProductLabels(nextLabels);
    await saveDeliveryDisplay(productVisibility, nextLabels);
    setEditingProduct(null);
    setLabelDraft("");
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Operations</p>
        <h1 className="text-4xl font-black text-[#15130f]">Delivery Settings</h1>
        <p className="mt-2 text-sm text-neutral-500">Control which products show delivery information on the storefront and which delivery label each product uses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="admin-card rounded-[22px] p-5">
          <Truck className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Products with fees</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{products.filter((product) => Number(product.deliveryFee || 0) > 0).length}</p>
        </div>
        <div className="admin-card rounded-[22px] p-5">
          <Truck className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Lowest product fee</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">
            {products.length ? money(Math.min(...products.map((product) => Number(product.deliveryFee || 0)))) : "$0.00"}
          </p>
        </div>
        <div className="admin-card rounded-[22px] p-5">
          <Truck className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Showing on frontend</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{products.filter((product) => productVisibility[product.id]).length}</p>
        </div>
      </div>

      <section className="admin-card rounded-[26px] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Storefront</p>
            <h2 className="text-2xl font-black text-[#15130f]">Product Delivery Label Display</h2>
            <p className="mt-2 text-sm text-neutral-500">Turn the frontend delivery label on or off for each product, and edit the label text per product.</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Brand</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Delivery Fee</th>
                <th className="px-5 py-4">Delivery Label</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((product) => (
                <tr key={product.id} className="transition hover:bg-[#fffdf8]">
                  <td className="px-5 py-4 font-black text-[#15130f]">{product.name}</td>
                  <td className="px-5 py-4 text-sm font-bold text-[#15130f]">{product.brand || "-"}</td>
                  <td className="px-5 py-4 text-sm text-neutral-500">{product.category}</td>
                  <td className="px-5 py-4 font-black text-[#15130f]">{money(product.deliveryFee || 0)}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-[#15130f]">{productLabels[product.id] || getDefaultDeliveryLabel(product)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <label className={`flex w-fit min-h-10 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-xs font-black transition ${productVisibility[product.id] ? "border-[#ffdc1f] bg-[#fff5c4] text-[#15130f]" : "border-neutral-200 bg-white text-neutral-500"}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(productVisibility[product.id])}
                        onChange={(event) => void toggleProductVisibility(product.id, event.target.checked)}
                        className="sr-only"
                      />
                      <Truck size={16} />
                      {productVisibility[product.id] ? "On" : "Off"}
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => startEditLabel(product)}
                        className="rounded-xl bg-[#fbfaf7] p-2 text-[#15130f] transition hover:bg-[#ffdc1f]"
                        title="Edit delivery label"
                      >
                        <Pencil size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!products.length && <p className="mt-4 text-sm text-neutral-500">No products found.</p>}
      </section>

      {editingProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/35 px-4 backdrop-blur-sm">
          <section className="admin-card w-full max-w-lg rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Delivery Label</p>
                <h2 className="text-2xl font-black text-[#15130f]">{editingProduct.name}</h2>
                <p className="mt-2 text-sm text-neutral-500">Default label uses the product delivery-fee value.</p>
              </div>
              <button type="button" onClick={cancelEditLabel} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-[#fbfaf7] p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-400">Default value</p>
                <p className="mt-2 text-lg font-black text-[#15130f]">{getDefaultDeliveryLabel(editingProduct)}</p>
              </div>

              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Delivery label value
                <Input
                  value={labelDraft}
                  onChange={(event) => setLabelDraft(event.target.value)}
                  placeholder={getDefaultDeliveryLabel(editingProduct)}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditLabel}
                className="h-11 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#15130f]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveProductLabel()}
                disabled={savingDisplay}
                className="h-11 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-[#2b261d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingDisplay ? "Saving..." : "Save Label"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

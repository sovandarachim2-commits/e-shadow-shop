"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, CheckCircle2, Clock3, DollarSign, History, ImageIcon, ImagePlus, PackagePlus, Pencil, Plus, RotateCcw, Search, Sparkles, Tag, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { Brand, Category, Product } from "@/lib/types";
import { money } from "@/lib/format";
import { prepareImageForUpload } from "@/lib/media-upload";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

const empty = {
  name: "",
  description: "",
  price: "",
  salePrice: "",
  deliveryFee: "",
  stock: "",
  brand: "",
  category: "",
  style: "",
  imageUrl: "",
  isOnSale: false,
  isNewArrival: false,
  promotionLabel: ""
};

type ProductHistory = {
  id: string;
  action: "Added" | "Updated" | "Deleted";
  name: string;
  at: string;
};

export default function AdminProductsPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ src: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [historyItems, setHistoryItems] = useState<ProductHistory[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const visibleProducts = useMemo(() =>
    products.filter((product) =>
      `${product.name} ${product.brand || ""} ${product.category} ${product.description}`.toLowerCase().includes(query.toLowerCase())
    ),
    [products, query]
  );
  const productStats = useMemo(() => ({
    total: products.length,
    newArrivals: products.filter((product) => product.isNewArrival).length,
    onSale: products.filter((product) => product.isOnSale).length
  }), [products]);
  const productValue = Number(form.salePrice || form.price || 0);
  const currentStock = Number(form.stock || 0);
  const styleOptions = useMemo(
    () => Array.from(new Set(["Essentials", "Skincare", "Makeup", "Fragrance", "Haircare", "Body Care", ...products.map((product) => product.style || "").filter(Boolean)])),
    [products]
  );

  function load() {
    fetch("/api/products").then((r) => r.json()).then((data) => setProducts(data.products || []));
  }

  useEffect(load, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("shadow-product-history");
      if (saved) setHistoryItems(JSON.parse(saved));
    } catch {
      setHistoryItems([]);
    }
  }, []);

  useEffect(() => {
    fetch("/api/brands")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  async function upload(file: File) {
    const prepared = await prepareImageForUpload(file);
    if (prepared.error || !prepared.file) {
      toast(prepared.error || "Upload failed", "error");
      return;
    }

    const localPreview = URL.createObjectURL(prepared.file);
    setPreviewUrl(localPreview);
    setUploading(true);
    const body = new FormData();
    body.append("file", prepared.file);
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch("/api/upload", { method: "POST", headers, body });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setForm((current) => ({ ...current, imageUrl: data.url }));
        toast(prepared.compressed ? "Image compressed and uploaded" : "Image uploaded");
      } else {
        toast(data.message || "Upload failed", "error");
      }
    } catch {
      toast("Upload failed. Please try a smaller image.", "error");
    } finally {
      setUploading(false);
    }
  }

  function recordHistory(action: ProductHistory["action"], name: string) {
    const entry = { id: `${Date.now()}`, action, name, at: new Date().toISOString() };
    setHistoryItems((current) => {
      const next = [entry, ...current].slice(0, 12);
      window.localStorage.setItem("shadow-product-history", JSON.stringify(next));
      return next;
    });
  }

  function resetForm() {
    setForm(empty);
    setEditing(null);
    setPreviewUrl("");
  }

  const openEdit = useCallback((product: Product) => {
    setEditing(product.id);
    setPreviewUrl("");
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      salePrice: product.salePrice ? String(product.salePrice) : "",
      deliveryFee: product.deliveryFee ? String(product.deliveryFee) : "0",
      stock: String(product.stock),
      brand: product.brand || "",
      category: product.category,
      style: product.style || "",
      imageUrl: product.imageUrl,
      isOnSale: Boolean(product.isOnSale),
      isNewArrival: Boolean(product.isNewArrival),
      promotionLabel: product.promotionLabel || ""
    });
    setFormOpen(true);
  }, []);

  async function saveProduct() {
    if (!form.imageUrl) return toast("Please upload a product image", "error");
    const response = await fetch(editing ? `/api/products/${editing}` : "/api/products", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...form, salePrice: form.salePrice || null, promotionLabel: form.promotionLabel || null })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return toast(data.message || "Save failed", "error");
    }
    recordHistory(editing ? "Updated" : "Added", form.name);
    toast(editing ? "Product updated" : "Product added");
    resetForm();
    setFormOpen(false);
    load();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (editing) {
      setConfirmUpdate(true);
      return;
    }
    await saveProduct();
  }

  async function remove(id: string) {
    const product = products.find((item) => item.id === id);
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`/api/products/${id}`, { method: "DELETE", headers });
    if (response.ok && product) recordHistory("Deleted", product.name);
    load();
  }

  const productListSection = useMemo(() => (
    <section className="admin-card overflow-hidden rounded-[26px]">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <div>
          <h2 className="text-xl font-black text-[#15130f]">Product List</h2>
          <p className="mt-1 text-sm text-neutral-500">{visibleProducts.length} products showing</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
            <tr>
              <th className="px-5 py-4">No</th>
              <th className="px-5 py-4">Image</th>
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Brand</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">Delivery Fee</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visibleProducts.map((product, index) => (
              <tr key={product.id} className="align-middle transition hover:bg-[#fffdf8]">
                <td className="px-5 py-4 text-sm font-black text-[#15130f]">{index + 1}</td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setImagePreview({ src: product.imageUrl, name: product.name })}
                    className="relative h-16 w-16 overflow-hidden rounded-2xl bg-neutral-100 transition hover:ring-4 hover:ring-[#ffdc1f]/45"
                    title="View image"
                  >
                    <Image src={product.imageUrl} alt={product.name} fill sizes="64px" className="object-cover" />
                  </button>
                </td>
                <td className="max-w-[260px] px-5 py-4">
                  <p className="truncate font-black text-[#15130f]">{product.name}</p>
                  <p className="mt-1 truncate text-sm text-neutral-500">{product.style || "Essentials"}</p>
                </td>
                <td className="px-5 py-4 text-sm font-bold text-[#15130f]">{product.brand || "-"}</td>
                <td className="px-5 py-4 text-sm text-neutral-500">{product.category}</td>
                <td className="px-5 py-4">
                  <p className="font-black text-[#15130f]">{money(product.salePrice || product.price)}</p>
                  {product.isOnSale && product.salePrice && <p className="text-xs text-neutral-400 line-through">{money(product.price)}</p>}
                </td>
                <td className="px-5 py-4 text-sm font-bold text-[#15130f]">{money(product.deliveryFee || 0)}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {product.isOnSale && <span className="rounded-full bg-[#ffe7df] px-3 py-1 text-xs font-black text-[#de745c]">{product.promotionLabel || "On Sale"}</span>}
                    {product.isNewArrival && <span className="rounded-full bg-[#fff5c4] px-3 py-1 text-xs font-black text-[#15130f]">New</span>}
                    {!product.isOnSale && !product.isNewArrival && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-500">Regular</span>}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(product)} className="rounded-xl bg-[#fbfaf7] p-2 text-[#15130f] hover:bg-[#ffdc1f]" title="Edit product">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => setConfirmDelete(product)} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Delete product">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visibleProducts.length && <p className="px-5 py-6 text-sm text-neutral-500">No products found.</p>}
    </section>
  ), [openEdit, visibleProducts]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Inventory</p>
          <h1 className="text-4xl font-black text-[#15130f]">Products</h1>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-[#2b261d]"
          >
            <Plus size={18} />
            Add Product
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-[#2b261d]"
          >
            <History size={18} />
            History
          </button>
          <label className="flex h-12 w-full max-w-sm items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-500">
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search products..." />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="admin-card rounded-[22px] p-5">
          <Boxes className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Total products</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{productStats.total}</p>
        </div>
        <div className="admin-card rounded-[22px] p-5">
          <Sparkles className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">New arrivals</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{productStats.newArrivals}</p>
        </div>
        <div className="admin-card rounded-[22px] p-5">
          <ImagePlus className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">On sale</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{productStats.onSale}</p>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/35 px-4 backdrop-blur-sm">
          <section className="admin-card w-full max-w-xl rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Product log</p>
                <h2 className="text-2xl font-black text-[#15130f]">History</h2>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto">
              {historyItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl bg-[#fbfaf7] p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffdc1f] text-[#15130f]">
                    <Clock3 size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#15130f]">{item.name}</p>
                    <p className="text-sm text-neutral-500">{new Date(item.at).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#15130f]">{item.action}</span>
                </div>
              ))}
              {!historyItems.length && <p className="rounded-2xl bg-[#fbfaf7] p-4 text-sm text-neutral-500">No product history yet. Add, edit, or delete a product to start the log.</p>}
            </div>
          </section>
        </div>
      )}

      {imagePreview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/45 px-4 backdrop-blur-sm">
          <section className="admin-card w-full max-w-3xl overflow-hidden rounded-[30px]">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Product Image</p>
                <h2 className="text-2xl font-black text-[#15130f]">{imagePreview.name}</h2>
              </div>
              <button type="button" onClick={() => setImagePreview(null)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
            <div className="relative aspect-[4/3] bg-[#fbfaf7]">
              <Image src={imagePreview.src} alt={imagePreview.name} fill sizes="768px" className="object-contain" />
            </div>
          </section>
        </div>
      )}

      <AdminConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete product?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          remove(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />

      <AdminConfirmDialog
        open={confirmUpdate}
        title="Update product?"
        message={`Save changes to "${form.name}"?`}
        confirmLabel="Update"
        onCancel={() => setConfirmUpdate(false)}
        onConfirm={async () => {
          setConfirmUpdate(false);
          await saveProduct();
        }}
      />

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#15130f]/35 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card mx-auto w-full max-w-6xl overflow-hidden rounded-[30px]">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Product Form</p>
                <h2 className="text-2xl font-black text-[#15130f]">{editing ? "Edit Product" : "Add Product"}</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
        <div className="grid lg:grid-cols-[360px_1fr]">
          <aside className="bg-[#15130f] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffdc1f]">Product form</p>
                <h2 className="mt-2 text-2xl font-black">{editing ? "Edit product" : "Add product"}</h2>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ffdc1f] text-[#15130f]">
                <PackagePlus size={23} />
              </span>
            </div>

            <div className="relative mt-6 aspect-square overflow-hidden rounded-[26px] bg-white/10">
              {form.imageUrl || previewUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${previewUrl || form.imageUrl})` }}
                  aria-label={form.name || "Product preview"}
                />
              ) : (
                <div className="grid h-full place-items-center text-center text-white/55">
                  <div>
                    <ImageIcon className="mx-auto" size={42} />
                    <p className="mt-3 text-sm font-bold">Image preview</p>
                  </div>
                </div>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#15130f] transition hover:bg-[#ffdc1f]">
              <UploadCloud size={18} />
              Upload product image
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload(file);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <p className="mt-3 text-center text-xs font-bold text-white/60">
              {uploading ? "Uploading image..." : form.imageUrl ? "Image ready for product save." : "Choose an image before saving."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <DollarSign size={18} className="text-[#ffdc1f]" />
                <p className="mt-2 text-xs text-white/55">Display price</p>
                <p className="text-xl font-black">{money(productValue)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Boxes size={18} className="text-[#ffdc1f]" />
                <p className="mt-2 text-xs text-white/55">Stock</p>
                <p className="text-xl font-black">{currentStock}</p>
              </div>
            </div>
          </aside>

          <div className="grid gap-5 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-black text-[#15130f]">Product details</h3>
                <p className="mt-1 text-sm text-neutral-500">Fill the required fields, upload a clean image, then publish to the shop.</p>
              </div>
              {editing && (
                <button type="button" onClick={resetForm} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#fbfaf7] px-4 text-sm font-black text-[#15130f]">
                  <RotateCcw size={17} />
                  New product
                </button>
              )}
            </div>

            <section className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Name
                <Input required placeholder="Glow serum" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Style
                <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} className="h-12 rounded-xl border border-[#f3c7b8]/70 bg-white px-4 text-sm text-[#082b4c] outline-none">
                  <option value="">Select style</option>
                  {styleOptions.map((style) => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Brand
                <select required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="h-12 rounded-xl border border-[#f3c7b8]/70 bg-white px-4 text-sm text-[#082b4c] outline-none">
                  <option value="">Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.name}>{brand.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Category
                <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-12 rounded-xl border border-[#f3c7b8]/70 bg-white px-4 text-sm text-[#082b4c] outline-none">
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </label>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Price
                <Input required placeholder="0.00" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Sale price
                <Input placeholder="0.00" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Delivery fee
                <Input placeholder="0.00" type="number" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} />
              </label>
            </section>

            <section className="grid gap-4 lg:grid-cols-1">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Stock
                <Input required placeholder="0" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </label>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Promotion label
                <Input placeholder="20% OFF" value={form.promotionLabel} onChange={(e) => setForm({ ...form, promotionLabel: e.target.value })} />
              </label>
              <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-black transition ${form.isOnSale ? "border-[#ffdc1f] bg-[#fff5c4] text-[#15130f]" : "border-neutral-200 bg-white text-neutral-500"}`}>
                <input type="checkbox" checked={form.isOnSale} onChange={(e) => setForm({ ...form, isOnSale: e.target.checked })} className="sr-only" />
                {form.isOnSale ? <CheckCircle2 size={18} /> : <Tag size={18} />}
                On Sale
              </label>
              <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-black transition ${form.isNewArrival ? "border-[#ffdc1f] bg-[#fff5c4] text-[#15130f]" : "border-neutral-200 bg-white text-neutral-500"}`}>
                <input type="checkbox" checked={form.isNewArrival} onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })} className="sr-only" />
                {form.isNewArrival ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
                New Arrival
              </label>
            </section>

            <label className="grid gap-2 text-sm font-black text-[#15130f]">
              Description
              <Textarea required placeholder="Describe texture, benefits, size, and usage notes..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-36" />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={uploading} className="h-12 flex-1 rounded-2xl bg-[#15130f] text-white hover:bg-[#2b261d]">
                {uploading ? "Uploading image..." : editing ? "Update product" : "Add product"}
              </Button>
              <button type="button" onClick={resetForm} className="h-12 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#15130f]">
                Clear
              </button>
            </div>
          </div>
        </div>
          </form>
        </div>
      )}

      {productListSection}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { Category } from "@/lib/types";
import { validateImageUpload } from "@/lib/media-upload";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

const empty = { name: "", imageUrl: "", sortOrder: "0", isActive: true };

export default function AdminCategoriesPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const headers = useCallback((): HeadersInit => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const load = useCallback(() => {
    fetch("/api/categories?all=true", { headers: headers() })
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []));
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCategory() {
    const response = await fetch(editing ? `/api/categories/${editing}` : "/api/categories", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({
        name: form.name,
        imageUrl: form.imageUrl || null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive
      })
    });

    if (!response.ok) return toast("Could not save category", "error");
    toast(editing ? "Category updated" : "Category added");
    setForm(empty);
    setEditing(null);
    setFormOpen(false);
    load();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (editing) {
      setConfirmUpdate(true);
      return;
    }
    await saveCategory();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) return toast("Could not delete category", "error");
    toast("Category deleted");
    load();
  }

  function openEdit(category: Category) {
    setEditing(category.id);
    setForm({ name: category.name, imageUrl: category.imageUrl || "", sortOrder: String(category.sortOrder), isActive: category.isActive });
    setFormOpen(true);
  }

  async function uploadImage(file: File) {
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast(validationError, "error");
      return;
    }

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", headers: headers(), body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return toast(data.message || "Image upload failed", "error");
      setForm((current) => ({ ...current, imageUrl: data.url }));
      toast("Category image uploaded");
    } catch {
      toast("Image upload failed. Please try a smaller image.", "error");
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Catalog</p>
        <h1 className="text-4xl font-black text-[#15130f]">Categories</h1>
      </div>
      <p className="mt-2 text-sm text-neutral-500">Manage the product categories admins can assign to products.</p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setFormOpen(true);
          }}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white hover:bg-[#2b261d]"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/35 px-4 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card w-full max-w-xl rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Catalog Form</p>
                <h2 className="text-2xl font-black text-[#15130f]">{editing ? "Edit Category" : "Add Category"}</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Category name
                <Input required placeholder="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <div className="grid gap-3 rounded-2xl bg-[#fbfaf7] p-4">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-white">
                  {form.imageUrl ? (
                    <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${form.imageUrl})` }} />
                  ) : (
                    <div className="grid h-full place-items-center text-neutral-400">
                      <div className="text-center">
                        <ImageIcon className="mx-auto" size={34} />
                        <p className="mt-2 text-sm font-bold">Routine image preview</p>
                      </div>
                    </div>
                  )}
                </div>
                <Input placeholder="/uploads/category.png or https://..." value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-4 text-sm font-black text-white hover:bg-[#2b261d]">
                  <UploadCloud size={17} />
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadImage(file);
                      event.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Sort order
                <Input type="number" placeholder="Sort order" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
              </label>
              <label className={`relative flex h-14 cursor-pointer items-center rounded-full px-4 text-lg font-black text-white transition ${form.isActive ? "justify-start bg-[#27b34a]" : "justify-end bg-[#ef1d2a]"}`}>
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="sr-only" />
                <span>{form.isActive ? "ON" : "OFF"}</span>
                <span className={`absolute top-1 h-12 w-12 rounded-full bg-white shadow-md transition ${form.isActive ? "right-1" : "left-1"}`} />
              </label>
              <Button className="h-12 rounded-2xl">{editing ? "Update category" : "Add category"}</Button>
            </div>
          </form>
        </div>
      )}

      <AdminConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete category?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
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
        title="Update category?"
        message={`Save changes to "${form.name}"?`}
        confirmLabel="Update"
        onCancel={() => setConfirmUpdate(false)}
        onConfirm={async () => {
          setConfirmUpdate(false);
          await saveCategory();
        }}
      />

      <section className="admin-card overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Category List</h2>
            <p className="mt-1 text-sm text-neutral-500">{categories.length} categories showing</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Image</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Sort Order</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((category, index) => (
                <tr key={category.id} className="transition hover:bg-[#fffdf8]">
                  <td className="px-5 py-4 text-sm font-black text-[#15130f]">{index + 1}</td>
                  <td className="px-5 py-4">
                    <div className="h-14 w-20 overflow-hidden rounded-xl bg-[#fbfaf7]">
                      {category.imageUrl ? (
                        <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${category.imageUrl})` }} />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <ImageIcon className="text-neutral-400" size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-lg font-black text-[#15130f]">{category.name}</td>
                  <td className="px-5 py-4 text-sm font-bold text-neutral-500">{category.sortOrder}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${category.isActive ? "bg-[#ffdc1f] text-[#15130f]" : "bg-neutral-200 text-neutral-600"}`}>
                      {category.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(category)}
                        className="rounded-xl bg-[#fbfaf7] p-2 text-[#15130f] hover:bg-[#ffdc1f]"
                        title="Edit category"
                      >
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => setConfirmDelete(category)} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Delete category">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!categories.length && <p className="px-5 py-6 text-sm text-neutral-500">No categories yet.</p>}
      </section>
    </div>
  );
}

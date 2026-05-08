"use client";

import { Pencil, Plus, Save, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { defaultHomeHero, getRoutinePostersFromHero, HomeHero, RoutinePoster } from "@/lib/home-hero";
import { validateImageUpload } from "@/lib/media-upload";
import { useToastStore } from "@/lib/toast-store";
import { Brand } from "@/lib/types";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeHero(data: Partial<HomeHero>): HomeHero {
  return {
    ...defaultHomeHero,
    ...data,
    routineVideos: data.routineVideos || defaultHomeHero.routineVideos,
    routinePosters: getRoutinePostersFromHero(data)
  };
}

export default function AdminRoutinePosterPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [hero, setHero] = useState<HomeHero>(defaultHomeHero);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftPoster, setDraftPoster] = useState<RoutinePoster | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/brands")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]));

    fetch("/api/settings/home")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setHero(normalizeHero(data.hero || {})))
      .catch(() => null);
  }, []);

  function updateDraft(patch: Partial<RoutinePoster>) {
    setDraftPoster((current) => (current ? { ...current, ...patch } : current));
  }

  function openAddModal() {
    setEditingIndex(null);
    setDraftPoster({
      id: makeId(),
      title: "Routine Poster",
      imageUrl: "",
      brand: ""
    });
  }

  function openEditModal(index: number) {
    const poster = hero.routinePosters[index];
    if (!poster) return;
    setEditingIndex(index);
    setDraftPoster({ ...poster });
  }

  function closeModal() {
    setEditingIndex(null);
    setDraftPoster(null);
    setUploading(false);
  }

  async function saveRoutinePosters(routinePosters: RoutinePoster[], successMessage: string) {
    setSaving(true);
    const response = await fetch("/api/settings/home", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...hero, routinePosters })
    });
    setSaving(false);
    if (!response.ok) {
      toast("Could not save routine posters", "error");
      return false;
    }

    setHero((current) => ({ ...current, routinePosters }));
    toast(successMessage);
    return true;
  }

  async function removePoster(index: number) {
    const nextRoutinePosters = hero.routinePosters.filter((_, posterIndex) => posterIndex !== index);
    const saved = await saveRoutinePosters(nextRoutinePosters, "Routine poster deleted");
    if (saved && editingIndex === index) closeModal();
  }

  async function uploadPoster(file: File) {
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast(validationError, "error");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.url) {
        updateDraft({ imageUrl: data.url });
        toast("Poster uploaded");
      } else {
        toast(data.message || "Upload failed", "error");
      }
    } catch {
      toast("Upload failed. Please try a smaller image.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draftPoster) return;
    if (!draftPoster.imageUrl.trim()) return toast("Please add a poster image", "error");
    if (!draftPoster.brand.trim()) return toast("Please select a brand", "error");

    const normalizedPoster = {
      ...draftPoster,
      title: draftPoster.title.trim() || draftPoster.brand.trim(),
      imageUrl: draftPoster.imageUrl.trim(),
      brand: draftPoster.brand.trim()
    };

    const nextRoutinePosters = editingIndex === null
      ? [normalizedPoster, ...hero.routinePosters]
      : [
          normalizedPoster,
          ...hero.routinePosters.filter((_, index) => index !== editingIndex)
        ];
    const saved = await saveRoutinePosters(nextRoutinePosters, editingIndex === null ? "Routine poster added" : "Routine poster updated");
    if (saved) closeModal();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Content</p>
          <h1 className="text-4xl font-black text-[#15130f]">Routine Poster</h1>
          <p className="mt-2 text-sm text-neutral-500">Manage the image carousel shown below the routine video section.</p>
        </div>
        <button type="button" onClick={openAddModal} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-[#2b261d]">
          <Plus size={18} />
          Add Poster
        </button>
      </div>

      <section className="admin-card overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Routine Poster List</h2>
            <p className="mt-1 text-sm text-neutral-500">{hero.routinePosters.length} posters showing</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Poster</th>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Brand</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {hero.routinePosters.map((poster, index) => (
                <tr key={poster.id || index} className="align-middle transition hover:bg-[#fffdf8]">
                  <td className="px-5 py-4 text-sm font-black text-[#15130f]">{index + 1}</td>
                  <td className="px-5 py-4">
                    <div
                      className="h-20 w-28 rounded-2xl bg-neutral-100 bg-cover bg-center"
                      style={poster.imageUrl ? { backgroundImage: `url(${poster.imageUrl})` } : undefined}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-black text-[#15130f]">{poster.title || poster.brand}</p>
                  </td>
                  <td className="max-w-[320px] px-5 py-4">
                    <p className="truncate text-sm text-neutral-500">{poster.brand || "No brand selected"}</p>
                  </td>
                  <td className="px-5 py-4">
                    {poster.imageUrl ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Ready</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(index)} className="rounded-xl bg-[#fbfaf7] p-2 text-[#15130f] hover:bg-[#ffdc1f]" title="Edit poster">
                        <Pencil size={18} />
                      </button>
                      <button type="button" onClick={() => removePoster(index)} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Delete poster">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!hero.routinePosters.length && <p className="px-5 py-6 text-sm text-neutral-500">No routine posters yet.</p>}
      </section>

      {draftPoster && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#15130f]/35 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card mx-auto grid w-full max-w-5xl gap-5 overflow-hidden rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">
                  {editingIndex === null ? "Add Routine Poster" : `Edit Poster ${editingIndex + 1}`}
                </p>
                <h2 className="text-2xl font-black text-[#15130f]">{draftPoster.title || "Routine Poster"}</h2>
              </div>
              <button type="button" onClick={closeModal} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_420px]">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Poster title
                  <Input value={draftPoster.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Brand
                  <select
                    value={draftPoster.brand || ""}
                    onChange={(event) => updateDraft({ brand: event.target.value })}
                    className="h-12 rounded-xl border border-[#f3c7b8]/70 bg-white px-4 text-sm text-[#082b4c] outline-none"
                  >
                    <option value="">Select brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.name}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Poster image URL
                  <Input value={draftPoster.imageUrl} onChange={(event) => updateDraft({ imageUrl: event.target.value })} />
                </label>
                <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-4 text-sm font-black text-white transition hover:bg-[#2b261d]">
                  <UploadCloud size={18} />
                  {uploading ? "Uploading poster..." : "Upload poster"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadPoster(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div>
                {draftPoster.imageUrl ? (
                  <div
                    className="aspect-[4/3] w-full rounded-2xl bg-neutral-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${draftPoster.imageUrl})` }}
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-[#fbfaf7] text-sm font-bold text-neutral-500">No poster selected</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-neutral-100 px-5 py-4">
              <button type="button" onClick={closeModal} className="h-12 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#15130f]">
                Cancel
              </button>
              <Button disabled={saving} className="h-12 rounded-2xl">
                <Save size={18} />
                {saving ? "Saving..." : editingIndex === null ? "Add Poster" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

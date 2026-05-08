"use client";

import { Link2, Pencil, Plus, Save, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { defaultHomeHero, getRoutineVideosFromHero, HomeHero, RoutineMediaLink } from "@/lib/home-hero";
import { useToastStore } from "@/lib/toast-store";
import { Brand } from "@/lib/types";

type RoutineVideo = HomeHero["routineVideos"][number];
const mediaIconOptions = [
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "tiktok", label: "TikTok" },
  { value: "website", label: "Website" },
  { value: "link", label: "Link" }
] as const;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeMediaLink(): RoutineMediaLink {
  return {
    id: makeId(),
    url: "",
    icon: "link"
  };
}

function normalizeHero(data: Partial<HomeHero>): HomeHero {
  const next = { ...defaultHomeHero, ...data };
  next.routineVideos = getRoutineVideosFromHero(data);
  return next;
}

function replaceVideoAtIndex(videos: RoutineVideo[], index: number, video: RoutineVideo) {
  return videos.map((currentVideo, videoIndex) => (videoIndex === index ? video : currentVideo));
}

export default function AdminRoutineVideoPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [hero, setHero] = useState<HomeHero>(defaultHomeHero);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftVideo, setDraftVideo] = useState<RoutineVideo | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"videoUrl" | "posterUrl" | null>(null);

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

  function updateDraft(patch: Partial<RoutineVideo>) {
    setDraftVideo((current) => (current ? { ...current, ...patch } : current));
  }

  function openAddModal() {
    setEditingIndex(null);
    setDraftVideo({
      id: makeId(),
      brand: "",
      videoUrl: "",
      posterUrl: "",
      mediaLink: "",
      mediaLinks: [makeMediaLink()],
      eyebrow: "Watch Routine",
      title: "New Routine Video",
      description: ""
    });
  }

  function openEditModal(index: number) {
    const video = hero.routineVideos[index];
    if (!video) return;
    setEditingIndex(index);
    setDraftVideo({ ...video });
  }

  function closeModal() {
    setEditingIndex(null);
    setDraftVideo(null);
    setUploading(null);
  }

  function updateMediaLink(linkIndex: number, patch: Partial<RoutineMediaLink>) {
    setDraftVideo((current) => {
      if (!current) return current;
      return {
        ...current,
        mediaLinks: (current.mediaLinks || []).map((link, index) => (index === linkIndex ? { ...link, ...patch } : link))
      };
    });
  }

  function addMediaLink() {
    setDraftVideo((current) => {
      if (!current) return current;
      return {
        ...current,
        mediaLinks: [...(current.mediaLinks || []), makeMediaLink()]
      };
    });
  }

  function removeMediaLink(linkIndex: number) {
    setDraftVideo((current) => {
      if (!current) return current;
      return {
        ...current,
        mediaLinks: (current.mediaLinks || []).filter((_, index) => index !== linkIndex)
      };
    });
  }

  async function saveRoutineVideos(routineVideos: RoutineVideo[], successMessage: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...hero, routineVideos })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast(data.message || "Could not save routine videos", "error");
        return false;
      }

      const savedHero = normalizeHero(data.hero || { ...hero, routineVideos });
      setHero(savedHero);
      toast(successMessage);
      return true;
    } catch {
      toast("Could not save routine videos", "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(index: number) {
    const nextRoutineVideos = hero.routineVideos.filter((_, videoIndex) => videoIndex !== index);
    const saved = await saveRoutineVideos(nextRoutineVideos, "Routine video deleted");
    if (saved && editingIndex === index) closeModal();
  }

  async function uploadMedia(file: File, target: "videoUrl" | "posterUrl") {
    setUploading(target);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.url) {
      updateDraft({ [target]: data.url });
      toast(target === "videoUrl" ? "Video uploaded" : "Poster uploaded");
    } else {
      toast(data.message || "Upload failed", "error");
    }
    setUploading(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draftVideo) return;
    if (!draftVideo.videoUrl.trim()) return toast("Please add a video URL or upload a video", "error");

    const normalizedVideo = {
      ...draftVideo,
      brand: draftVideo.brand.trim(),
      videoUrl: draftVideo.videoUrl.trim(),
      posterUrl: draftVideo.posterUrl.trim(),
      mediaLink: "",
      mediaLinks: (draftVideo.mediaLinks || [])
        .map((link, index) => ({
          id: String(link.id || `${draftVideo.id}-media-${index + 1}`),
          url: link.url.trim(),
          icon: link.icon || "link"
        }))
        .filter((link) => link.url),
      eyebrow: draftVideo.eyebrow.trim() || "Watch Routine",
      title: draftVideo.title.trim() || "Routine Video",
      description: draftVideo.description.trim()
    };
    const nextRoutineVideos = editingIndex === null
      ? [normalizedVideo, ...hero.routineVideos]
      : replaceVideoAtIndex(hero.routineVideos, editingIndex, normalizedVideo);
    const saved = await saveRoutineVideos(nextRoutineVideos, editingIndex === null ? "Routine video added" : "Routine video updated");
    if (saved) closeModal();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Content</p>
          <h1 className="text-4xl font-black text-[#15130f]">Routine Video</h1>
          <p className="mt-2 text-sm text-neutral-500">Add multiple videos for the Browse By Routine slider.</p>
        </div>
        <button type="button" onClick={openAddModal} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-[#2b261d]">
          <Plus size={18} />
          Add Video
        </button>
      </div>

      <section className="admin-card overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Routine Video List</h2>
            <p className="mt-1 text-sm text-neutral-500">{hero.routineVideos.length} videos showing</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Poster</th>
                <th className="px-5 py-4">Routine</th>
                <th className="px-5 py-4">Brand</th>
                <th className="px-5 py-4">Eyebrow</th>
                <th className="px-5 py-4">Media Links</th>
                <th className="px-5 py-4">Video</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {hero.routineVideos.map((video, index) => (
                <tr key={video.id || index} className="align-middle transition hover:bg-[#fffdf8]">
                  <td className="px-5 py-4 text-sm font-black text-[#15130f]">{index + 1}</td>
                  <td className="px-5 py-4">
                    <div
                      className="h-16 w-20 rounded-2xl bg-neutral-100 bg-cover bg-center"
                      style={video.posterUrl ? { backgroundImage: `url(${video.posterUrl})` } : undefined}
                    />
                  </td>
                  <td className="max-w-[300px] px-5 py-4">
                    <p className="truncate font-black text-[#15130f]">{video.title || "Routine Video"}</p>
                    <p className="mt-1 truncate text-sm text-neutral-500">{video.description || "No description"}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-[#15130f]">{video.brand || "All brands"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-[#15130f]">{video.eyebrow || "-"}</td>
                  <td className="max-w-[220px] px-5 py-4">
                    <p className="truncate text-sm text-neutral-500">{video.mediaLinks?.length ? `${video.mediaLinks.length} links` : "No media links"}</p>
                  </td>
                  <td className="max-w-[220px] px-5 py-4">
                    <p className="truncate text-sm text-neutral-500">{video.videoUrl || "No video URL"}</p>
                  </td>
                  <td className="px-5 py-4">
                    {video.videoUrl ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Ready</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">Missing</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(index)} className="rounded-xl bg-[#fbfaf7] p-2 text-[#15130f] hover:bg-[#ffdc1f]" title="Edit video">
                        <Pencil size={18} />
                      </button>
                      <button type="button" onClick={() => removeVideo(index)} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Delete video">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!hero.routineVideos.length && <p className="px-5 py-6 text-sm text-neutral-500">No routine videos yet.</p>}
      </section>

      {draftVideo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#15130f]/35 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card mx-auto grid w-full max-w-6xl gap-5 overflow-hidden rounded-[30px]">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">
                  {editingIndex === null ? "Add Routine Video" : `Edit Video ${editingIndex + 1}`}
                </p>
                <h2 className="text-2xl font-black text-[#15130f]">{draftVideo.title || "Routine Video"}</h2>
              </div>
              <button type="button" onClick={closeModal} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Video URL
                    <Input value={draftVideo.videoUrl} onChange={(event) => updateDraft({ videoUrl: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Poster image URL
                    <Input value={draftVideo.posterUrl} onChange={(event) => updateDraft({ posterUrl: event.target.value })} />
                  </label>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#15130f]">Media links</p>
                    <button type="button" onClick={addMediaLink} className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-4 text-xs font-black text-white transition hover:bg-[#2b261d]">
                      <Plus size={16} />
                      Add link
                    </button>
                  </div>
                  {(draftVideo.mediaLinks || []).length ? (
                    <div className="grid gap-3">
                      {(draftVideo.mediaLinks || []).map((link, linkIndex) => (
                        <div key={link.id || linkIndex} className="grid gap-3 rounded-2xl border border-neutral-200 bg-[#fbfaf7] p-4">
                          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                            <label className="grid gap-2 text-sm font-black text-[#15130f]">
                              Icon
                              <select
                                value={link.icon || "link"}
                                onChange={(event) => updateMediaLink(linkIndex, { icon: event.target.value })}
                                className="h-12 rounded-xl border border-[#f3c7b8]/70 bg-white px-4 text-sm text-[#082b4c] outline-none"
                              >
                                {mediaIconOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-2 text-sm font-black text-[#15130f]">
                              Link URL
                              <div className="relative">
                                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                <Input value={link.url} onChange={(event) => updateMediaLink(linkIndex, { url: event.target.value })} className="pl-11" placeholder="https://instagram.com/... or https://t.me/..." />
                              </div>
                            </label>
                            <div className="flex items-end">
                              <button type="button" onClick={() => removeMediaLink(linkIndex)} className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600 transition hover:bg-red-100" title="Remove media link">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-neutral-200 bg-[#fbfaf7] px-4 py-5 text-sm text-neutral-500">No media links yet.</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-4 text-sm font-black text-white transition hover:bg-[#2b261d]">
                    <UploadCloud size={18} />
                    {uploading === "videoUrl" ? "Uploading video..." : "Upload video"}
                    <input type="file" accept="video/*" className="sr-only" onChange={(event) => event.target.files?.[0] && uploadMedia(event.target.files[0], "videoUrl")} />
                  </label>
                  <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#15130f] ring-1 ring-neutral-200 transition hover:bg-[#fffdf8]">
                    <UploadCloud size={18} />
                    {uploading === "posterUrl" ? "Uploading poster..." : "Upload poster"}
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => event.target.files?.[0] && uploadMedia(event.target.files[0], "posterUrl")} />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Brand
                    <select
                      value={draftVideo.brand || ""}
                      onChange={(event) => updateDraft({ brand: event.target.value })}
                      className="h-12 rounded-xl border border-[#f3c7b8]/70 bg-white px-4 text-sm text-[#082b4c] outline-none"
                    >
                      <option value="">All brands</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.name}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Eyebrow
                    <Input value={draftVideo.eyebrow} onChange={(event) => updateDraft({ eyebrow: event.target.value })} />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-1">
                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Title
                    <Input value={draftVideo.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Description
                  <Textarea value={draftVideo.description} onChange={(event) => updateDraft({ description: event.target.value })} />
                </label>
              </div>

              <div>
                {draftVideo.videoUrl ? (
                  <video className="aspect-video w-full rounded-2xl bg-black object-cover" controls preload="metadata" poster={draftVideo.posterUrl}>
                    <source src={draftVideo.videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="grid aspect-video place-items-center rounded-2xl bg-[#fbfaf7] text-sm font-bold text-neutral-500">No video selected</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-neutral-100 px-5 py-4">
              <button type="button" onClick={closeModal} className="h-12 rounded-2xl border border-neutral-200 bg-white px-5 text-sm font-black text-[#15130f]">
                Cancel
              </button>
              <Button disabled={saving} className="h-12 rounded-2xl">
                <Save size={18} />
                {saving ? "Saving..." : editingIndex === null ? "Add Video" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

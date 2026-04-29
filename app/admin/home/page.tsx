"use client";

import Image from "next/image";
import { Loader2, Save, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";
import { defaultHomeHero, HomeHero } from "@/lib/home-hero";

export default function AdminHomePage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [hero, setHero] = useState<HomeHero>(defaultHomeHero);
  const [saving, setSaving] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const previewImage = hero.imageUrl?.trim() || defaultHomeHero.imageUrl;

  useEffect(() => {
    fetch("/api/settings/home")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setHero({ ...defaultHomeHero, ...(data.hero || {}) }))
      .catch(() => null);
  }, []);

  function updateHeroStat(index: number, field: "value" | "label", value: string) {
    setHero((current) => ({
      ...current,
      stats: current.stats.map((stat, statIndex) => (statIndex === index ? { ...stat, [field]: value } : stat))
    }));
  }

  async function uploadHeroImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingHeroImage(true);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (!response.ok) {
        toast("Could not upload hero image", "error");
        return;
      }

      const data = await response.json();
      setHero((current) => ({ ...current, imageUrl: String(data.url || "") }));
      toast("Hero image uploaded");
    } catch {
      toast("Could not upload hero image", "error");
    } finally {
      setUploadingHeroImage(false);
      event.target.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/settings/home", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(hero)
    });
    setSaving(false);
    if (!response.ok) return toast("Could not save home page", "error");
    toast("Home page saved");
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Content</p>
        <h1 className="text-4xl font-black text-[#15130f]">Home Page</h1>
        <p className="mt-2 text-sm text-neutral-500">Edit the homepage hero, keep the upload area clean, and preview the result before saving.</p>
      </div>

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <section className="admin-card grid gap-6 rounded-[30px] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-5">
            <div>
              <h2 className="text-xl font-black text-[#15130f]">Home Hero</h2>
              <p className="mt-1 text-sm text-neutral-500">This controls the first section on the storefront homepage.</p>
            </div>
            <div className="rounded-2xl bg-[#fbfaf7] px-4 py-3 text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e0a900]">Live Setup</p>
              <p className="mt-1 text-sm font-bold text-[#15130f]">{uploadingHeroImage ? "Uploading image..." : "Preview updates instantly"}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Eyebrow
                <Input value={hero.eyebrow} onChange={(event) => setHero({ ...hero, eyebrow: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Today pick
                <Input value={hero.todayPickTitle} onChange={(event) => setHero({ ...hero, todayPickTitle: event.target.value })} />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-black text-[#15130f]">
              Main title
              <Textarea value={hero.title} onChange={(event) => setHero({ ...hero, title: event.target.value })} />
            </label>

            <label className="grid gap-2 text-sm font-black text-[#15130f]">
              Description
              <Textarea value={hero.description} onChange={(event) => setHero({ ...hero, description: event.target.value })} />
            </label>

            <div className="rounded-[28px] border border-[#f3c7b8]/70 bg-[linear-gradient(180deg,#fffdfb_0%,#fbfaf7_100%)] p-4 md:p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#15130f]">Hero image</p>
                      <p className="mt-1 text-xs text-neutral-500">Upload once, preview it instantly, or paste a URL manually.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-black text-[#15130f] shadow-sm transition hover:border-[#e0a900] hover:text-[#e0a900]">
                      {uploadingHeroImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingHeroImage ? "Uploading..." : "Upload image"}
                      <input type="file" accept="image/*" className="hidden" onChange={uploadHeroImage} disabled={uploadingHeroImage} />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Hero image URL
                    <Input value={hero.imageUrl} onChange={(event) => setHero({ ...hero, imageUrl: event.target.value })} />
                  </label>

                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Image alt text
                    <Input value={hero.imageAlt} onChange={(event) => setHero({ ...hero, imageAlt: event.target.value })} placeholder="Describe the hero image" />
                  </label>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e9897e]">Image Preview</p>
                  <div className="relative h-52 overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-sm">
                    <Image src={previewImage} alt={hero.imageAlt || "Hero preview"} fill className="object-cover object-center" unoptimized />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#15130f]/55 to-transparent p-4">
                      <p className="text-sm font-black text-white">{hero.todayPickTitle || defaultHomeHero.todayPickTitle}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-neutral-500">Best result: use a wide image with clear subject focus near the center.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Primary button text
                <Input value={hero.primaryLabel} onChange={(event) => setHero({ ...hero, primaryLabel: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Primary button link
                <Input value={hero.primaryHref} onChange={(event) => setHero({ ...hero, primaryHref: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Secondary button text
                <Input value={hero.secondaryLabel} onChange={(event) => setHero({ ...hero, secondaryLabel: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Secondary button link
                <Input value={hero.secondaryHref} onChange={(event) => setHero({ ...hero, secondaryHref: event.target.value })} />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {hero.stats.map((stat, index) => (
                <div key={index} className="rounded-[24px] border border-neutral-100 bg-[#fbfaf7] p-4">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#e9897e]">Stat {index + 1}</p>
                  <label className="grid gap-2 text-sm font-black text-[#15130f]">
                    Stat value
                    <Input value={stat.value} onChange={(event) => updateHeroStat(index, "value", event.target.value)} />
                  </label>
                  <label className="mt-4 grid gap-2 text-sm font-black text-[#15130f]">
                    Stat label
                    <Input value={stat.label} onChange={(event) => updateHeroStat(index, "label", event.target.value)} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-neutral-100 pt-5">
            <Button disabled={saving} className="h-12 rounded-2xl">
              <Save size={18} />
              {saving ? "Saving..." : "Save Home Page"}
            </Button>
          </div>
        </section>

        <aside className="admin-card h-fit rounded-[30px] p-5 md:sticky md:top-5">
          <div className="border-b border-neutral-100 pb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#e9897e]">Storefront Preview</p>
            <h3 className="mt-2 text-2xl font-black text-[#15130f]">Frontend Friendly</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">This is a simplified live preview of the real homepage hero so you can check spacing, buttons, and image balance before saving.</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#fff9f4_0%,#fdece5_45%,#f8ded8_100%)] shadow-sm">
            <div className="relative min-h-[540px] overflow-hidden p-5">
              <div className="absolute inset-y-0 right-0 w-[58%]">
                <div className="absolute left-4 top-8 h-[75%] w-[78%] rounded-[36px] bg-white/60 shadow-sm" />
                <div className="absolute right-4 top-14 h-36 w-36 rounded-full bg-[#f6bdb0]/55 blur-3xl" />
                <Image
                  src={previewImage}
                  alt={hero.imageAlt || "Hero preview"}
                  fill
                  unoptimized
                  className="object-cover object-center mix-blend-multiply"
                />
              </div>

              <div className="relative z-10 flex min-h-[500px] max-w-[54%] flex-col justify-center">
                <p className="text-[11px] font-black uppercase tracking-[0.36em] text-[#e9897e]">{hero.eyebrow || defaultHomeHero.eyebrow}</p>
                <h4 className="mt-4 font-serif text-4xl font-bold leading-[0.95] text-[#082b4c]">{hero.title || defaultHomeHero.title}</h4>
                <p className="mt-5 text-sm leading-6 text-[#697b91]">{hero.description || defaultHomeHero.description}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex min-w-32 items-center justify-center rounded-2xl bg-[#082b4c] px-4 py-3 text-sm font-black text-white">
                    {hero.primaryLabel || defaultHomeHero.primaryLabel}
                  </span>
                  <span className="inline-flex min-w-32 items-center justify-center rounded-2xl border border-[#082b4c]/15 bg-white/70 px-4 py-3 text-sm font-black text-[#082b4c]">
                    {hero.secondaryLabel || defaultHomeHero.secondaryLabel}
                  </span>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {hero.stats.map((item, index) => (
                    <div key={`${item.value}-${item.label}-${index}`} className="rounded-2xl bg-white/72 p-3 shadow-sm backdrop-blur">
                      <p className="text-lg font-black text-[#082b4c]">{item.value || "0"}</p>
                      <p className="mt-1 text-[11px] text-[#697b91]">{item.label || "Label"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-6 right-6 max-w-[220px] rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e9897e]">{hero.todayPickLabel || defaultHomeHero.todayPickLabel}</p>
                <p className="mt-2 text-base font-black text-[#082b4c]">{hero.todayPickTitle || defaultHomeHero.todayPickTitle}</p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

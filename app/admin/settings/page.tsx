"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { DEFAULT_BRAND_NAME } from "@/lib/site-brand";
import { useToastStore } from "@/lib/toast-store";

type FooterGroupForm = {
  title: string;
  links: string;
};

type SocialForm = {
  label: string;
  url: string;
};

export default function AdminSettingsPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [description, setDescription] = useState("Premium skincare, makeup, and beauty essentials curated for a soft daily glow.");
  const [groups, setGroups] = useState<FooterGroupForm[]>([
    { title: "Company", links: "About\nSupport\nContact" },
    { title: "Help", links: "About\nSupport\nContact" },
    { title: "Social", links: "About\nSupport\nContact" }
  ]);
  const [socials, setSocials] = useState<SocialForm[]>([
    { label: "TikTok", url: "" },
    { label: "Telegram", url: "" },
    { label: "Facebook", url: "" },
    { label: "Instagram", url: "" }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/footer")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const footer = data.footer;
        setBrandName(footer.brandName || DEFAULT_BRAND_NAME);
        setDescription(footer.description || "");
        setGroups(
          (footer.groups || []).slice(0, 3).map((group: { title: string; links: string[] }) => ({
            title: group.title,
            links: (group.links || []).join("\n")
          }))
        );
        setSocials(
          (footer.socials || [
            { label: "TikTok", url: "" },
            { label: "Telegram", url: "" },
            { label: "Facebook", url: "" },
            { label: "Instagram", url: "" }
          ]).slice(0, 4)
        );
      })
      .catch(() => null);
  }, []);

  function updateGroup(index: number, field: keyof FooterGroupForm, value: string) {
    setGroups((current) => current.map((group, groupIndex) => (groupIndex === index ? { ...group, [field]: value } : group)));
  }

  function updateSocial(index: number, field: keyof SocialForm, value: string) {
    setSocials((current) => current.map((social, socialIndex) => (socialIndex === index ? { ...social, [field]: value } : social)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/settings/footer", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        brandName,
        description,
        socials: socials.filter((social) => social.label.trim()).map((social) => ({ label: social.label.trim(), url: social.url.trim() })),
        groups: groups.map((group) => ({
          title: group.title,
          links: group.links.split("\n").map((link) => link.trim()).filter(Boolean)
        }))
      })
    });
    setSaving(false);
    if (!response.ok) return toast("Could not save settings", "error");
    toast("Settings saved");
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Others</p>
        <h1 className="text-4xl font-black text-[#15130f]">Settings</h1>
        <p className="mt-2 text-sm text-neutral-500">Manage the footer provider content shown on the website.</p>
      </div>

      <form onSubmit={submit} className="admin-card grid gap-5 rounded-[26px] p-5">
        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Footer Brand</h2>
            <p className="mt-1 text-sm text-neutral-500">This controls the large brand block on the website footer.</p>
          </div>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-black text-[#15130f]">
              Brand name
              <Input value={brandName} onChange={(event) => setBrandName(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-black text-[#15130f]">
              Description
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="grid gap-4 border-t border-neutral-100 pt-5 lg:grid-cols-[360px_1fr]">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Social Contact</h2>
            <p className="mt-1 text-sm text-neutral-500">Shown as round icon buttons below the footer description.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {socials.map((social, index) => (
              <div key={index} className="rounded-2xl bg-[#fbfaf7] p-4">
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Label
                  <Input value={social.label} onChange={(event) => updateSocial(index, "label", event.target.value)} />
                </label>
                <label className="mt-4 grid gap-2 text-sm font-black text-[#15130f]">
                  Link
                  <Input placeholder="https://..." value={social.url} onChange={(event) => updateSocial(index, "url", event.target.value)} />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-t border-neutral-100 pt-5 lg:grid-cols-[360px_1fr]">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Footer Menus</h2>
            <p className="mt-1 text-sm text-neutral-500">Put one menu item per line.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {groups.map((group, index) => (
              <div key={index} className="rounded-2xl bg-[#fbfaf7] p-4">
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Column title
                  <Input value={group.title} onChange={(event) => updateGroup(index, "title", event.target.value)} />
                </label>
                <label className="mt-4 grid gap-2 text-sm font-black text-[#15130f]">
                  Links
                  <Textarea value={group.links} onChange={(event) => updateGroup(index, "links", event.target.value)} />
                </label>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end border-t border-neutral-100 pt-5">
          <Button disabled={saving} className="h-12 rounded-2xl">
            <Save size={18} />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

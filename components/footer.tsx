"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Facebook, Instagram, Music2, Send } from "lucide-react";
import { DEFAULT_BRAND_NAME } from "@/lib/site-brand";

type FooterSettings = {
  brandName: string;
  description: string;
  socials?: Array<{ label: string; url: string }>;
  groups: Array<{ title: string; links: string[] }>;
};

const defaultFooter: FooterSettings = {
  brandName: DEFAULT_BRAND_NAME,
  description: "Premium skincare, makeup, and beauty essentials curated for a soft daily glow.",
  socials: [
    { label: "TikTok", url: "" },
    { label: "Telegram", url: "" },
    { label: "Facebook", url: "" },
    { label: "Instagram", url: "" }
  ],
  groups: [
    { title: "Company", links: ["About", "Support", "Contact"] },
    { title: "Help", links: ["About", "Support", "Contact"] },
    { title: "Social", links: ["About", "Support", "Contact"] }
  ]
};

export function Footer() {
  const pathname = usePathname();
  const [footer, setFooter] = useState<FooterSettings>(defaultFooter);

  useEffect(() => {
    fetch("/api/settings/footer")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setFooter(data.footer || defaultFooter))
      .catch(() => setFooter(defaultFooter));
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  const socialIcons = {
    tiktok: Music2,
    telegram: Send,
    facebook: Facebook,
    instagram: Instagram
  };

  return (
    <footer className="mt-20 border-t border-[var(--champagne)] bg-[var(--surface-tint)] py-12">
      <div className="container-page grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <h2 className="text-3xl font-black text-[var(--foreground)]">{footer.brandName}</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">{footer.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {(footer.socials || []).map((social) => {
              const Icon = socialIcons[social.label.toLowerCase() as keyof typeof socialIcons] || Send;
              const content = (
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--champagne)] bg-white text-[var(--foreground)] transition hover:bg-[var(--navy)] hover:text-white" title={social.label}>
                  <Icon size={18} />
                </span>
              );
              return social.url ? (
                <a key={social.label} href={social.url} target="_blank" rel="noreferrer" aria-label={social.label}>
                  {content}
                </a>
              ) : (
                <span key={social.label}>{content}</span>
              );
            })}
          </div>
        </div>
        {footer.groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-bold text-[var(--foreground)]">{group.title}</h3>
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              {group.links.map((link) => (
                <span key={link}>{link}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}

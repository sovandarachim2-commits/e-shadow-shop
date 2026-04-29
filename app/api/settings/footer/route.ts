import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { readSiteSetting, writeSiteSetting } from "@/lib/site-settings";
import { DEFAULT_BRAND_NAME } from "@/lib/site-brand";

const defaultFooter = {
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

export async function GET() {
  const footer = await readSiteSetting("footer", defaultFooter);
  return NextResponse.json({ footer });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = await request.json();
  const footer = {
    brandName: String(body.brandName || defaultFooter.brandName),
    description: String(body.description || defaultFooter.description),
    socials: Array.isArray(body.socials) ? body.socials.slice(0, 4) : defaultFooter.socials,
    groups: Array.isArray(body.groups) ? body.groups.slice(0, 3) : defaultFooter.groups
  };

  await writeSiteSetting("footer", footer);

  return NextResponse.json({ footer });
}

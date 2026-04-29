import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { defaultHomeHero, getRoutineVideosFromHero } from "@/lib/home-hero";
import { readSiteSetting, writeSiteSetting } from "@/lib/site-settings";

export async function GET() {
  const hero = await readSiteSetting("homeHero", defaultHomeHero);
  return NextResponse.json({ hero });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN, Role.STAFF]);
  if (auth.response) return auth.response;

  const body = await request.json();
  const routineVideos = Array.isArray(body.routineVideos)
    ? body.routineVideos.slice(0, 12).map((video: any, index: number) => ({
        id: String(video.id || `routine-video-${index + 1}`),
        brand: String(video.brand || ""),
        videoUrl: String(video.videoUrl || ""),
        posterUrl: String(video.posterUrl || ""),
        mediaLink: String(video.mediaLink || ""),
        mediaLinks: Array.isArray(video.mediaLinks)
          ? video.mediaLinks
              .slice(0, 6)
              .map((link: any, linkIndex: number) => ({
                id: String(link.id || `${video.id || `routine-video-${index + 1}`}-media-${linkIndex + 1}`),
                url: String(link.url || ""),
                icon: String(link.icon || "link")
              }))
              .filter((link: { url: string }) => link.url.trim())
          : String(video.mediaLink || "").trim()
            ? [{ id: `${video.id || `routine-video-${index + 1}`}-media-1`, url: String(video.mediaLink || ""), icon: "link" }]
            : [],
        eyebrow: String(video.eyebrow || defaultHomeHero.routineVideoEyebrow),
        title: String(video.title || "Routine Video"),
        description: String(video.description || "")
      })).filter((video: { videoUrl: string }) => video.videoUrl)
    : getRoutineVideosFromHero(body);
  const hero = {
    eyebrow: String(body.eyebrow || defaultHomeHero.eyebrow),
    title: String(body.title || defaultHomeHero.title),
    description: String(body.description || defaultHomeHero.description),
    imageUrl: String(body.imageUrl || defaultHomeHero.imageUrl),
    imageAlt: String(body.imageAlt || defaultHomeHero.imageAlt),
    primaryLabel: String(body.primaryLabel || defaultHomeHero.primaryLabel),
    primaryHref: String(body.primaryHref || defaultHomeHero.primaryHref),
    secondaryLabel: String(body.secondaryLabel || defaultHomeHero.secondaryLabel),
    secondaryHref: String(body.secondaryHref || defaultHomeHero.secondaryHref),
    todayPickLabel: String(body.todayPickLabel || defaultHomeHero.todayPickLabel),
    todayPickTitle: String(body.todayPickTitle || defaultHomeHero.todayPickTitle),
    routineVideoUrl: String(body.routineVideoUrl || defaultHomeHero.routineVideoUrl),
    routineVideoPosterUrl: String(body.routineVideoPosterUrl || defaultHomeHero.routineVideoPosterUrl),
    routineVideoEyebrow: String(body.routineVideoEyebrow || defaultHomeHero.routineVideoEyebrow),
    routineVideoTitle: String(body.routineVideoTitle || defaultHomeHero.routineVideoTitle),
    routineVideoDescription: String(body.routineVideoDescription || defaultHomeHero.routineVideoDescription),
    routineVideos,
    stats: Array.isArray(body.stats) ? body.stats.slice(0, 3) : defaultHomeHero.stats
  };

  await writeSiteSetting("homeHero", hero);
  return NextResponse.json({ hero });
}

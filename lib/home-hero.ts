export type RoutineMediaLink = {
  id: string;
  url: string;
  icon: string;
};

export type RoutineVideo = {
  id: string;
  brand: string;
  videoUrl: string;
  posterUrl: string;
  mediaLink: string;
  mediaLinks: RoutineMediaLink[];
  eyebrow: string;
  title: string;
  description: string;
};

export type HomeHero = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  todayPickLabel: string;
  todayPickTitle: string;
  routineVideoUrl: string;
  routineVideoPosterUrl: string;
  routineVideoEyebrow: string;
  routineVideoTitle: string;
  routineVideoDescription: string;
  routineVideos: RoutineVideo[];
  stats: Array<{ value: string; label: string }>;
};

export const defaultHomeHero: HomeHero = {
  eyebrow: "Think Beauty",
  title: "Your One-stop Beauty Destination",
  description: "Discover premium skincare, soft glam essentials, and cosmetic favorites curated for a clean, confident daily routine.",
  imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1400&auto=format&fit=crop",
  imageAlt: "Premium cosmetic products and makeup brushes",
  primaryLabel: "Shop Now",
  primaryHref: "/shop",
  secondaryLabel: "New Arrivals",
  secondaryHref: "/shop?promotion=new",
  todayPickLabel: "Today Pick",
  todayPickTitle: "Hydrating Glow Serum",
  routineVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  routineVideoPosterUrl: "https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=1200&auto=format&fit=crop",
  routineVideoEyebrow: "Watch Routine",
  routineVideoTitle: "Daily Glow Guide",
  routineVideoDescription: "Tap play to watch a short routine before choosing your product category.",
  routineVideos: [
    {
      id: "daily-glow-guide",
      brand: "",
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      posterUrl: "https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=1200&auto=format&fit=crop",
      mediaLink: "",
      mediaLinks: [],
      eyebrow: "Watch Routine",
      title: "Daily Glow Guide",
      description: "Tap play to watch a short routine before choosing your product category."
    }
  ],
  stats: [
    { value: "80+", label: "Brands" },
    { value: "1.2k+", label: "Products" },
    { value: "25k+", label: "Customers" }
  ]
};

function isDefaultRoutineVideoFields(data: Partial<HomeHero>) {
  return (
    (data.routineVideoUrl || "") === defaultHomeHero.routineVideoUrl &&
    (data.routineVideoPosterUrl || "") === defaultHomeHero.routineVideoPosterUrl &&
    (data.routineVideoEyebrow || "") === defaultHomeHero.routineVideoEyebrow &&
    (data.routineVideoTitle || "") === defaultHomeHero.routineVideoTitle &&
    (data.routineVideoDescription || "") === defaultHomeHero.routineVideoDescription
  );
}

export function getRoutineVideosFromHero(data: Partial<HomeHero>): RoutineVideo[] {
  if (Array.isArray(data.routineVideos)) {
    return data.routineVideos
      .filter((video) => String(video.videoUrl || "").trim())
      .map((video, index) => ({
        id: String(video.id || `routine-video-${index + 1}`),
        brand: String(video.brand || ""),
        videoUrl: String(video.videoUrl || ""),
        posterUrl: String(video.posterUrl || ""),
        mediaLink: String(video.mediaLink || ""),
        mediaLinks: Array.isArray(video.mediaLinks)
          ? video.mediaLinks
              .map((link, linkIndex) => ({
                id: String(link?.id || `${video.id || `routine-video-${index + 1}`}-media-${linkIndex + 1}`),
                url: String(link?.url || ""),
                icon: String(link?.icon || "link")
              }))
              .filter((link) => link.url.trim())
          : String(video.mediaLink || "").trim()
            ? [
                {
                  id: `${video.id || `routine-video-${index + 1}`}-media-1`,
                  url: String(video.mediaLink || ""),
                  icon: "link"
                }
              ]
            : [],
        eyebrow: String(video.eyebrow || "Watch Routine"),
        title: String(video.title || "Routine Video"),
        description: String(video.description || "")
      }));
  }

  const hasLegacyRoutineVideo = Boolean(String(data.routineVideoUrl || "").trim());
  if (hasLegacyRoutineVideo && !isDefaultRoutineVideoFields(data)) {
    return [
      {
        id: "routine-video-1",
        brand: String(data.routineVideos?.[0]?.brand || ""),
        videoUrl: data.routineVideoUrl || "",
        posterUrl: data.routineVideoPosterUrl || "",
        mediaLink: "",
        mediaLinks: [],
        eyebrow: data.routineVideoEyebrow || "Watch Routine",
        title: data.routineVideoTitle || "Routine Video",
        description: data.routineVideoDescription || ""
      }
    ];
  }

  return [];
}

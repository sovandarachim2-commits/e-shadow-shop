"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Maximize2,
  MessageCircle,
  Pause,
  Play,
  Send,
  Volume2,
  VolumeX,
  Youtube
} from "lucide-react";
import type { RoutineVideo } from "@/lib/home-hero";

type RoutineVideoSliderProps = {
  videos: RoutineVideo[];
  emptyDescription?: string;
};

function mediaBadgeClasses(icon?: string) {
  switch (icon) {
    case "youtube":
      return "bg-[#ff0000] text-white";
    case "facebook":
      return "bg-[linear-gradient(135deg,#23a6ff,#1458ff)] text-white";
    case "instagram":
      return "bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] text-white";
    case "twitter":
      return "bg-[#1d9bf0] text-white";
    case "whatsapp":
      return "bg-[#25d366] text-white";
    case "messenger":
      return "bg-[linear-gradient(135deg,#00b2ff,#9d3bff,#ff4f8b)] text-white";
    case "telegram":
      return "bg-[#27a7e7] text-white";
    case "website":
      return "bg-[#1fb6ff] text-white";
    case "tiktok":
      return "bg-[#111111] text-white";
    default:
      return "bg-[#082b4c] text-white";
  }
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21l-6.02 6.88L22 22h-5.48l-4.29-5.61L7.32 22H4.56l6.44-7.36L2 2h5.62l3.88 5.12L18.244 2Zm-.96 18h1.53L6.8 3.9H5.16L17.284 20Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M14.12 3c.18 1.53 1.05 2.95 2.34 3.84a5.7 5.7 0 0 0 3.2.98v3.03a8.72 8.72 0 0 1-3.45-.7v5.45a6.6 6.6 0 1 1-6.6-6.58c.3 0 .58.03.87.07v3.08a3.61 3.61 0 1 0 2.64 3.48V3h3Z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.15 2 11.28c0 2.92 1.45 5.53 3.72 7.23V22l3.3-1.82c.88.24 1.82.38 2.98.38 5.52 0 10-4.15 10-9.28S17.52 2 12 2Zm1.08 12.49-2.54-2.7-4.96 2.7 5.46-5.79 2.63 2.7 4.87-2.7-5.46 5.79Z" />
    </svg>
  );
}

function MediaIcon({ icon }: { icon?: string }) {
  switch (icon) {
    case "youtube":
      return <Youtube size={18} />;
    case "facebook":
      return <Facebook size={18} />;
    case "instagram":
      return <Instagram size={18} />;
    case "twitter":
      return <XIcon />;
    case "whatsapp":
      return <MessageCircle size={18} />;
    case "messenger":
      return <MessengerIcon />;
    case "telegram":
      return <Send size={18} />;
    case "website":
      return <Globe size={18} />;
    case "tiktok":
      return <TikTokIcon />;
    default:
      return <ExternalLink size={18} />;
  }
}

function mediaIconLabel(icon?: string) {
  switch (icon) {
    case "youtube":
      return "YouTube";
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "twitter":
      return "Twitter";
    case "whatsapp":
      return "WhatsApp";
    case "messenger":
      return "Messenger";
    case "telegram":
      return "Telegram";
    case "website":
      return "Website";
    case "tiktok":
      return "TikTok";
    default:
      return "Link";
  }
}

function overlayButtonClasses() {
  return "grid h-12 w-12 place-items-center rounded-2xl bg-[#242427]/78 text-white shadow-lg backdrop-blur transition hover:bg-[#242427]/90";
}

export function RoutineVideoSlider({ videos, emptyDescription }: RoutineVideoSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mobileVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const desktopVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const shouldResumePlaybackRef = useRef(true);
  const suppressPauseEventRef = useRef(false);
  const activeVideo = videos[activeIndex];

  function getWrappedIndex(index: number) {
    return (index + videos.length) % videos.length;
  }

  useEffect(() => {
    if (!videos.length) return;
    setActiveIndex((current) => Math.min(current, videos.length - 1));
  }, [videos.length]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.45);
      },
      { threshold: [0.45, 0.6] }
    );

    observer.observe(rootRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const activeRefs = isMobileViewport ? mobileVideoRefs.current : desktopVideoRefs.current;

    activeRefs.forEach((video, index) => {
      if (!video) return;
      video.muted = isMuted;

      if (!isInViewport) {
        suppressPauseEventRef.current = true;
        video.pause();
        return;
      }

      if (index === activeIndex) {
        if (shouldResumePlaybackRef.current) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {
              setIsPlaying(false);
              shouldResumePlaybackRef.current = false;
            });
          });
        } else {
          suppressPauseEventRef.current = true;
          video.pause();
        }
      } else {
        suppressPauseEventRef.current = true;
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex, isInViewport, isMobileViewport, isMuted, isPlaying, videos]);

  function showSlide(index: number) {
    if (!videos.length) return;
    const nextIndex = (index + videos.length) % videos.length;
    setActiveIndex(nextIndex);
    shouldResumePlaybackRef.current = true;
    setIsPlaying(true);
  }

  async function toggleFullscreen() {
    if (!frameRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await frameRef.current.requestFullscreen?.().catch(() => undefined);
  }

  function togglePlayback() {
    const activeRefs = isMobileViewport ? mobileVideoRefs.current : desktopVideoRefs.current;
    const video = activeRefs[activeIndex];
    if (!video) return;

    if (isMobileViewport && isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.play().catch(() => undefined);
      shouldResumePlaybackRef.current = true;
      setIsPlaying(true);
      return;
    }

    if (video.paused) {
      video.play().catch(() => undefined);
      shouldResumePlaybackRef.current = true;
      setIsPlaying(true);
      return;
    }

    shouldResumePlaybackRef.current = false;
    video.pause();
    setIsPlaying(false);
  }

  if (!videos.length || !activeVideo) return null;

  const previewOffsets = [-2, -1, 0, 1, 2];
  const mobilePreviewOffsets = [-1, 0, 1];

  return (
    <div ref={rootRef} className="space-y-6">
      <div className="lg:hidden">
        <div className="overflow-hidden rounded-[28px] bg-white/45 px-2 py-3 touch-pan-y select-none">
          <div className="flex items-stretch justify-center gap-2 overflow-hidden">
            {mobilePreviewOffsets.map((offset) => {
              const slideIndex = getWrappedIndex(activeIndex + offset);
              const slide = videos[slideIndex];
              const isActive = offset === 0;

              if (!slide) return null;

              return (
                <div
                  key={`${slide.id}-mobile-${offset}`}
                  className={`relative overflow-hidden rounded-[24px] border border-[#f3c7b8]/60 bg-[#f7dcd8] transition-all duration-300 ${
                    isActive ? "w-[64vw] min-w-0 flex-1 shadow-[0_22px_65px_rgba(8,43,76,0.16)]" : "w-[8vw] min-w-[26px] max-w-[40px] opacity-55"
                  }`}
                >
                  {!isActive && videos.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => showSlide(slideIndex)}
                      className="absolute inset-0 z-10 flex items-center justify-center"
                      aria-label={offset < 0 ? "Previous video" : "Next video"}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/88 text-[#082b4c] shadow-[0_10px_28px_rgba(8,43,76,0.18)] backdrop-blur">
                        {offset < 0 ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
                      </span>
                    </button>
                  ) : null}

                  <div className="relative aspect-[9/16] w-full">
                    {isActive ? (
                      <div
                        ref={frameRef}
                        className="relative h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(244,206,200,0.76)_32%,rgba(230,166,159,0.92)_100%)]"
                      >
                        <button
                          type="button"
                          onClick={() => setIsMuted((current) => !current)}
                          className="absolute left-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-2xl bg-black/30 text-white shadow-lg backdrop-blur transition hover:bg-black/40"
                          aria-label={isMuted ? "Unmute video" : "Mute video"}
                        >
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        {videos.length > 1 ? (
                          <div className="absolute inset-x-16 top-5 z-10 flex gap-2">
                            {videos.map((video, index) => (
                              <div key={`${video.id}-mobile-progress`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/35">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    index === activeIndex ? "w-full bg-white/95" : "w-0"
                                  } ${index < activeIndex ? "w-full bg-white/70" : ""}`}
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {videos.map((video, index) => (
                          <video
                            key={video.id || `${video.videoUrl}-${index}`}
                            ref={(node) => {
                              mobileVideoRefs.current[index] = node;
                            }}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
                            }`}
                            playsInline
                            loop
                            preload="metadata"
                            poster={video.posterUrl}
                            muted={isMuted}
                            onClick={togglePlayback}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => {
                              if (suppressPauseEventRef.current) {
                                suppressPauseEventRef.current = false;
                                return;
                              }
                              shouldResumePlaybackRef.current = false;
                              setIsPlaying(false);
                            }}
                          >
                            <source src={video.videoUrl} type="video/mp4" />
                          </video>
                        ))}

                        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 via-black/5 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/28 via-black/10 to-transparent" />


                        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
                          {videos.map((video, index) => (
                            <button
                              key={`${video.id}-dot`}
                              type="button"
                              onClick={() => showSlide(index)}
                              className={`h-3 w-3 rounded-full transition ${
                                index === activeIndex ? "bg-[#3a3a44] shadow-[0_0_0_4px_rgba(255,255,255,0.26)]" : "bg-[#8e7678]/75 hover:bg-[#6f5d5f]"
                              }`}
                              aria-label={`Go to video ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => showSlide(slideIndex)}
                        className="group relative block h-full w-full"
                        aria-label={`Show video ${slideIndex + 1}`}
                      >
                        <video
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          playsInline
                          muted
                          preload="metadata"
                          poster={slide.posterUrl}
                        >
                          <source src={slide.videoUrl} type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 bg-white/18" />
                        <div className="absolute inset-0 bg-black/52 transition group-hover:bg-black/44" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-[36px] bg-white/45 px-4 py-4">
          <div className="flex items-stretch justify-center gap-5">
            {previewOffsets.map((offset) => {
              const slideIndex = getWrappedIndex(activeIndex + offset);
              const slide = videos[slideIndex];
              const isActive = offset === 0;
              const isEdge = Math.abs(offset) === 2;

              if (!slide) return null;

              return (
                <div
                  key={`${slide.id}-${offset}`}
                  className={`relative overflow-hidden rounded-[24px] border border-[#f3c7b8]/60 bg-[#f7dcd8] transition-all duration-300 ${
                    isActive
                      ? "z-10 w-[500px] min-w-[500px] max-w-[500px] scale-[1.02] shadow-[0_30px_80px_rgba(8,43,76,0.24)] ring-1 ring-white/70"
                      : isEdge
                        ? "w-[8vw] min-w-[90px] max-w-[130px] opacity-20 blur-[1px]"
                        : "w-[18vw] min-w-[190px] max-w-[280px] opacity-40 blur-[0.5px]"
                  }`}
                >
                  <div className="relative h-[76svh] min-h-[620px] w-full max-h-[860px]">
                    {isActive ? (
                      <div ref={frameRef} className="relative h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(244,206,200,0.76)_32%,rgba(230,166,159,0.92)_100%)]">
                        <button
                          type="button"
                          onClick={() => setIsMuted((current) => !current)}
                          className="absolute left-3 top-3 z-10 grid h-12 w-12 place-items-center rounded-2xl bg-black/30 text-white shadow-lg backdrop-blur transition hover:bg-black/40"
                          aria-label={isMuted ? "Unmute video" : "Mute video"}
                        >
                          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                        </button>

                        {videos.map((video, index) => (
                          <video
                            key={video.id || `${video.videoUrl}-${index}`}
                            ref={(node) => {
                              desktopVideoRefs.current[index] = node;
                            }}
                            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
                            }`}
                            playsInline
                            loop
                            preload="metadata"
                            poster={video.posterUrl}
                            muted={isMuted}
                            onClick={togglePlayback}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => {
                              if (suppressPauseEventRef.current) {
                                suppressPauseEventRef.current = false;
                                return;
                              }
                              shouldResumePlaybackRef.current = false;
                              setIsPlaying(false);
                            }}
                          >
                            <source src={video.videoUrl} type="video/mp4" />
                          </video>
                        ))}

                        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 via-black/5 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/28 via-black/10 to-transparent" />

                        <div className="absolute left-16 top-3 flex gap-3">
                          <button type="button" onClick={toggleFullscreen} className={overlayButtonClasses()} aria-label="Open fullscreen video">
                            <Maximize2 size={22} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => showSlide(activeIndex - 1)}
                          className="absolute left-3 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-black/78 text-white shadow-lg backdrop-blur transition hover:bg-black/88"
                          aria-label="Previous video"
                        >
                          <ChevronLeft size={28} />
                        </button>

                        <button
                          type="button"
                          onClick={() => showSlide(activeIndex + 1)}
                          className="absolute right-3 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-black/78 text-white shadow-lg backdrop-blur transition hover:bg-black/88"
                          aria-label="Next video"
                        >
                          <ChevronRight size={28} />
                        </button>

                        <button
                          type="button"
                          onClick={togglePlayback}
                          className="absolute bottom-16 left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-white/88 text-[#082b4c] shadow-lg backdrop-blur transition hover:bg-white"
                          aria-label={isPlaying ? "Pause video" : "Play video"}
                        >
                          {isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-[1px]" />}
                        </button>

                        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
                          {videos.map((video, index) => (
                            <button
                              key={`${video.id}-dot-desktop`}
                              type="button"
                              onClick={() => showSlide(index)}
                              className={`h-3 w-3 rounded-full transition ${
                                index === activeIndex ? "bg-[#3a3a44] shadow-[0_0_0_4px_rgba(255,255,255,0.26)]" : "bg-[#8e7678]/75 hover:bg-[#6f5d5f]"
                              }`}
                              aria-label={`Go to video ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => showSlide(slideIndex)}
                        className="group relative block h-full w-full"
                        aria-label={`Show video ${slideIndex + 1}`}
                      >
                        <video
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          playsInline
                          loop
                          muted
                          autoPlay
                          preload="metadata"
                          poster={slide.posterUrl}
                        >
                          <source src={slide.videoUrl} type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 bg-black/38 transition group-hover:bg-black/28" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#f3c7b8]/60 bg-[#fff8f3] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e9897e]">{activeVideo.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-black text-[#082b4c]">{activeVideo.title}</h3>
            {activeVideo.brand ? (
              <p className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#082b4c] shadow-sm">
                {activeVideo.brand}
              </p>
            ) : null}
          </div>

          {activeVideo.mediaLinks?.length ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {activeVideo.mediaLinks.map((link, linkIndex) => (
                <a
                  key={link.id || `${activeVideo.id}-media-${linkIndex}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`grid h-12 w-12 place-items-center rounded-full shadow-sm transition hover:scale-105 ${mediaBadgeClasses(link.icon)}`}
                  aria-label={`Open ${mediaIconLabel(link.icon)} for ${activeVideo.title}`}
                  title={mediaIconLabel(link.icon)}
                >
                  <MediaIcon icon={link.icon} />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-6 text-[#697b91]">{activeVideo.description || emptyDescription || "Watch the video to explore the routine."}</p>
      </div>
    </div>
  );
}

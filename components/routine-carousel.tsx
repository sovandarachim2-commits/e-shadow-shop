"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";

type RoutineCarouselProps = {
  categories: Category[];
  fallbackImages: Record<string, string>;
};

export function RoutineCarousel({ categories, fallbackImages }: RoutineCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function scrollByCard(direction: "left" | "right") {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cardWidth = Math.min(560, Math.max(280, scroller.clientWidth * 0.36));
    scroller.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  }

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current;
    const card = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !card) return;
    scroller.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setActiveIndex(index);
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function syncActiveDot() {
      if (!scroller) return;
      const cards = Array.from(scroller.children) as HTMLElement[];
      const nextIndex = cards.reduce((closestIndex, card, index) => {
        const closestDistance = Math.abs(cards[closestIndex].offsetLeft - scroller.scrollLeft);
        const distance = Math.abs(card.offsetLeft - scroller.scrollLeft);
        return distance < closestDistance ? index : closestIndex;
      }, 0);
      setActiveIndex(nextIndex);
    }

    scroller.addEventListener("scroll", syncActiveDot, { passive: true });
    syncActiveDot();
    return () => scroller.removeEventListener("scroll", syncActiveDot);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || categories.length <= 3) return;

    const interval = window.setInterval(() => {
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      if (scroller.scrollLeft >= maxScroll - 8) {
        scrollToIndex(0);
        return;
      }
      scroller.scrollBy({ left: 360, behavior: "smooth" });
    }, 3200);

    return () => window.clearInterval(interval);
  }, [categories.length]);

  return (
    <div className="relative mt-8">
      <div ref={scrollerRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={`/shop?category=${encodeURIComponent(category.name)}`}
            className={`group relative aspect-[4/3] w-[82vw] shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm sm:w-[520px] lg:w-[32%] ${["bg-[#f8ded8]", "bg-[#ddf3ff]", "bg-[#e8ddfb]"][index % 3]}`}
          >
            <Image src={category.imageUrl || fallbackImages[category.name] || fallbackImages.Skincare} alt={category.name} fill className="object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#082b4c]/55 via-[#082b4c]/5 to-transparent" />
            <span className="absolute bottom-5 left-5 font-serif text-2xl font-bold text-white drop-shadow">{category.name}</span>
          </Link>
        ))}
      </div>

      <button type="button" onClick={() => scrollByCard("left")} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#082b4c] shadow-sm transition hover:bg-[#ffdc1f]" aria-label="Previous routine">
        <ChevronLeft size={22} />
      </button>
      <button type="button" onClick={() => scrollByCard("right")} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#082b4c] shadow-sm transition hover:bg-[#ffdc1f]" aria-label="Next routine">
        <ChevronRight size={22} />
      </button>

      <div className="mt-5 flex items-center justify-center gap-3">
        {categories.map((category, index) => (
          <button
            key={category.id}
            type="button"
            onClick={() => scrollToIndex(index)}
            className={`h-3 w-3 rounded-full transition ${activeIndex === index ? "bg-[#082b4c]" : "bg-[#082b4c]/35 hover:bg-[#082b4c]/60"}`}
            aria-label={`Go to ${category.name}`}
          />
        ))}
      </div>
    </div>
  );
}

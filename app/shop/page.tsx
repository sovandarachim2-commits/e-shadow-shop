"use client";

import Image from "next/image";
import { ExternalLink, Facebook, Globe, Instagram, MessageCircle, Send, Youtube } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoutineVideosFromHero, HomeHero } from "@/lib/home-hero";
import { Brand, Category, Product } from "@/lib/types";

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

export default function ShopPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [promotion, setPromotion] = useState("");
  const [promotionProducts, setPromotionProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [hero, setHero] = useState<Partial<HomeHero>>({});
  const [randomSaleRoutineVideos, setRandomSaleRoutineVideos] = useState<ReturnType<typeof getRoutineVideosFromHero>>([]);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setBrand(searchParams.get("brand") || "");
    setCategory(searchParams.get("category") || "");
    setPromotion(searchParams.get("promotion") || "");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/brands")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]));

    fetch("/api/categories")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));

    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setAllProducts(data.products || []))
      .catch(() => setAllProducts([]));

    fetch("/api/settings/home")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setHero(data.hero || {}))
      .catch(() => setHero({}));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products?search=${encodeURIComponent(search)}&brand=${encodeURIComponent(brand)}&category=${encodeURIComponent(category)}&promotion=${encodeURIComponent(promotion)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setProducts(data.products || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, brand, category, promotion]);

  useEffect(() => {
    let cancelled = false;

    if (promotion !== "sale" && promotion !== "new") {
      setPromotionProducts([]);
      return;
    }

    fetch(`/api/products?promotion=${encodeURIComponent(promotion)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setPromotionProducts(data.products || []);
      })
      .catch(() => {
        if (!cancelled) setPromotionProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [promotion]);

  useEffect(() => {
    let cancelled = false;

    if (promotion !== "new") {
      setSaleProducts([]);
      return;
    }

    fetch("/api/products?promotion=sale")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setSaleProducts(data.products || []);
      })
      .catch(() => {
        if (!cancelled) setSaleProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [promotion]);

  const isPromotionPage = promotion === "sale" || promotion === "new";
  const selectedBrand = brands.find((item) => item.name === brand);
  const productBrandNames = useMemo(() => {
    return Array.from(new Set(allProducts.map((product) => product.brand).filter(Boolean)));
  }, [allProducts]);
  const productBrands = useMemo(() => {
    return productBrandNames.map((name) => brands.find((item) => item.name === name) || { id: name, name, logoUrl: null, sortOrder: 0, isActive: true });
  }, [brands, productBrandNames]);
  const promotionBrandNames = useMemo(() => {
    return Array.from(new Set(promotionProducts.map((product) => product.brand).filter(Boolean)));
  }, [promotionProducts]);
  const promotionBrands = useMemo(() => {
    return promotionBrandNames.map((name) => brands.find((item) => item.name === name) || { id: name, name, logoUrl: null, sortOrder: 0, isActive: true });
  }, [brands, promotionBrandNames]);
  const stripBrands = isPromotionPage ? promotionBrands : productBrands;
  const routineVideos = useMemo(() => getRoutineVideosFromHero(hero), [hero]);
  const brandRoutineVideos = useMemo(() => {
    if (!brand) return [];
    return routineVideos.filter((video) => (video.brand || "").trim().toLowerCase() === brand.trim().toLowerCase());
  }, [brand, routineVideos]);
  const visibleProducts = products.filter((product) => {
    if (brand && product.brand !== brand) return false;
    if (category && product.category !== category) return false;
    if (promotion === "sale" && !product.isOnSale) return false;
    if (promotion === "new" && !product.isNewArrival) return false;
    return true;
  });
  const visibleSaleProducts = saleProducts.filter((product) => {
    if (brand && product.brand !== brand) return false;
    if (category && product.category !== category) return false;
    return product.isOnSale;
  });
  const promotionRoutineVideos = brand ? brandRoutineVideos : routineVideos;

  useEffect(() => {
    if (promotion !== "sale" || brand || routineVideos.length === 0) {
      setRandomSaleRoutineVideos([]);
      return;
    }

    const shuffled = [...routineVideos];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    setRandomSaleRoutineVideos(shuffled);
  }, [brand, promotion, routineVideos]);

  const displayedRoutineVideos =
    promotion === "new"
      ? promotionRoutineVideos
      : promotion === "sale" && !brand
        ? randomSaleRoutineVideos
        : brandRoutineVideos;

  return (
    <section className="container-page py-12">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="font-serif text-5xl font-bold text-[#082b4c]">{promotion === "sale" ? "On Sale" : promotion === "new" ? "New Arrivals" : "Shop"}</h1>
            {brand && (
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#f3c7b8]/70 bg-white px-4 py-2 shadow-sm">
                {selectedBrand?.logoUrl && (
                  <span className="relative block h-10 w-10 overflow-hidden rounded-xl bg-[#fff8f3]">
                    <Image src={selectedBrand.logoUrl} alt={`${selectedBrand.name} logo`} fill className="object-contain p-1" />
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e9897e]">Brand</p>
                  <p className="text-base font-black text-[#082b4c]">{selectedBrand?.name || brand}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {stripBrands.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl bg-[#082b4c] px-4 py-4 text-white shadow-sm">
          <div className="flex items-center gap-5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setBrand("")}
              className={`shrink-0 rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${
                !brand ? "bg-white text-[#082b4c]" : "text-white/85 hover:bg-white/10"
              }`}
            >
              All
            </button>
            {stripBrands.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setBrand(item.name || "")}
                className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-2 text-lg font-black tracking-[0.18em] transition ${
                  brand === item.name ? "bg-white text-[#082b4c]" : "text-white/90 hover:bg-white/10"
                }`}
              >
                {item.logoUrl && (
                  <span className="block h-10 w-10 rounded-full bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${item.logoUrl})` }} />
                )}
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-96" />
            ))}
          </div>
        ) : !visibleProducts.length ? (
          <div className="rounded-2xl border border-[#f3c7b8]/70 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-xl font-bold text-[#082b4c]">No products found</p>
            <p className="mt-2 text-sm text-[#697b91]">Add products in admin or adjust your filters.</p>
          </div>
        ) : (
          <ProductGrid products={visibleProducts} />
        )}
      </div>

      {promotion === "new" && visibleSaleProducts.length > 0 && (
        <section className="mt-16">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e9897e]">More To Explore</p>
              <h2 className="mt-2 font-serif text-4xl font-bold text-[#082b4c]">On Sale Products</h2>
              <p className="mt-2 text-sm text-[#697b91]">After browsing the newest arrivals, check the current sale picks too.</p>
            </div>
          </div>
          <div className="mt-8">
            <ProductGrid products={visibleSaleProducts} />
          </div>
        </section>
      )}

      {displayedRoutineVideos.length > 0 && (
        <section className="mt-10 rounded-[28px] border border-[#f3c7b8]/70 bg-white/75 p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e9897e]">Routine Video</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#082b4c]">
                {promotion === "new" && !brand
                  ? "Routine Videos"
                  : promotion === "sale" && !brand
                    ? "Routine Videos"
                    : `${selectedBrand?.name || brand} Routine`}
              </h2>
              <p className="mt-2 text-sm text-[#697b91]">
                {promotion === "new" && !brand
                  ? "Watch routine videos after browsing the latest arrivals and sale products."
                  : promotion === "sale" && !brand
                    ? "After browsing the sale products, enjoy routine videos in a randomized order."
                  : "Explore the matching products first, then watch the brand routine video below."}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
              {displayedRoutineVideos.map((video, index) => (
                <article
                  key={video.id || `${video.videoUrl}-${index}`}
                  className="min-w-[min(92vw,1120px)] snap-start overflow-hidden rounded-[24px] border border-[#f3c7b8]/60 bg-[#fff8f3] shadow-sm"
                >
                  <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_360px]">
                    <video
                      className="aspect-video h-full w-full bg-[#082b4c] object-cover"
                      controls
                      preload="metadata"
                      poster={video.posterUrl}
                    >
                      <source src={video.videoUrl} type="video/mp4" />
                    </video>
                    <div className="flex flex-col justify-center border-t border-[#f3c7b8]/60 p-6 lg:border-l lg:border-t-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e9897e]">{video.eyebrow}</p>
                          <h3 className="mt-3 text-2xl font-black text-[#082b4c]">{video.title}</h3>
                        </div>
                        {video.mediaLinks?.length ? (
                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {video.mediaLinks.map((link, linkIndex) => (
                              <a
                                key={link.id || `${video.id}-media-${linkIndex}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`grid h-12 w-12 place-items-center rounded-full shadow-sm transition hover:scale-105 ${mediaBadgeClasses(link.icon)}`}
                                aria-label={`Open ${mediaIconLabel(link.icon)} for ${video.title}`}
                                title={mediaIconLabel(link.icon)}
                              >
                                <MediaIcon icon={link.icon} />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {video.brand ? (
                        <p className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#082b4c] shadow-sm">
                          {video.brand}
                        </p>
                      ) : null}
                      <p className="mt-3 text-sm leading-6 text-[#697b91]">{video.description || `Discover the routine behind ${selectedBrand?.name || brand}.`}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

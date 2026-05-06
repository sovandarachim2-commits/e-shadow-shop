"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product-grid";
import { RoutineCarousel } from "@/components/routine-carousel";
import { RoutineVideoSlider } from "@/components/routine-video-slider";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoutinePostersFromHero, getRoutineVideosFromHero, HomeHero } from "@/lib/home-hero";
import { Brand, Category, Product } from "@/lib/types";

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
  const [randomPromotionRoutinePosters, setRandomPromotionRoutinePosters] = useState<ReturnType<typeof getRoutinePostersFromHero>>([]);

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
  const routinePosters = useMemo(() => getRoutinePostersFromHero(hero), [hero]);
  const brandRoutineVideos = useMemo(() => {
    if (!brand) return [];
    return routineVideos.filter((video) => (video.brand || "").trim().toLowerCase() === brand.trim().toLowerCase());
  }, [brand, routineVideos]);
  const brandRoutinePosters = useMemo(() => {
    if (!brand) return [];
    return routinePosters.filter((poster) => (poster.brand || "").trim().toLowerCase() === brand.trim().toLowerCase());
  }, [brand, routinePosters]);
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

  useEffect(() => {
    if (!isPromotionPage || brand || routinePosters.length === 0) {
      setRandomPromotionRoutinePosters([]);
      return;
    }

    const shuffled = [...routinePosters];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    setRandomPromotionRoutinePosters(shuffled);
  }, [brand, isPromotionPage, routinePosters]);

  const displayedRoutineVideos =
    promotion === "new"
      ? promotionRoutineVideos
      : promotion === "sale" && !brand
        ? randomSaleRoutineVideos
        : brandRoutineVideos;
  const displayedRoutinePosters = brand ? brandRoutinePosters : randomPromotionRoutinePosters;

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
        <div className="mt-8 overflow-hidden rounded-[30px] border border-[#cfdcff] bg-[linear-gradient(135deg,#2e57d0_0%,#2e4fc3_55%,#3d63d7_100%)] px-5 py-5 text-white shadow-[0_20px_44px_rgba(46,79,195,0.22)]">
          <div className="mb-4 px-1">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/72">Shop By Brand</p>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setBrand("")}
              className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${
                !brand
                  ? "border-white/80 bg-white text-[#2e57d0] shadow-[0_14px_32px_rgba(10,37,112,0.20)]"
                  : "border-white/18 bg-white/10 text-white/92 hover:bg-white/18"
              }`}
            >
              All
            </button>
            {stripBrands.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setBrand(item.name || "")}
                className={`flex shrink-0 items-center gap-3 rounded-full border px-4 py-2.5 text-base font-black tracking-[0.12em] transition ${
                  brand === item.name
                    ? "border-white/80 bg-white text-[#2e57d0] shadow-[0_14px_32px_rgba(10,37,112,0.20)]"
                    : "border-white/18 bg-white/10 text-white/95 hover:bg-white/18"
                }`}
              >
                {item.logoUrl && (
                  <span className="block h-10 w-10 rounded-full border border-[#d8e2ff] bg-white bg-contain bg-center bg-no-repeat shadow-[0_6px_16px_rgba(25,57,138,0.15)]" style={{ backgroundImage: `url(${item.logoUrl})` }} />
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
            <RoutineVideoSlider
              videos={displayedRoutineVideos}
              emptyDescription={`Discover the routine behind ${selectedBrand?.name || brand}.`}
            />
          </div>
        </section>
      )}

      {displayedRoutinePosters.length > 0 && (
        <section className="mt-10 rounded-[28px] border border-[#f3c7b8]/70 bg-white/75 p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e9897e]">Routine Poster</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#082b4c]">
                {brand ? `${selectedBrand?.name || brand} Posters` : "Brand Posters"}
              </h2>
              <p className="mt-2 text-sm text-[#697b91]">
                {brand
                  ? "Showing poster images related to the selected brand."
                  : "Showing randomized poster images across all brands for this promotion page."}
              </p>
            </div>
          </div>

          <RoutineCarousel posters={displayedRoutinePosters} />
        </section>
      )}
    </section>
  );
}

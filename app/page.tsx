import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Facebook, Globe, Instagram, MessageCircle, Send, Youtube } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-grid";
import { RoutineCarousel } from "@/components/routine-carousel";
import { Brand, Category, Product } from "@/lib/types";
import { defaultHomeHero, getRoutineVideosFromHero, HomeHero } from "@/lib/home-hero";
import { prisma } from "@/lib/prisma";

async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/products`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return data.products || [];
  } catch {
    return [];
  }
}

async function getBrands(): Promise<Brand[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/brands`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return data.brands || [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/categories`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

async function getHomeHero(): Promise<HomeHero> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/settings/home`, { cache: "no-store" });
    if (!response.ok) return defaultHomeHero;
    const data = await response.json();
    return data.hero || defaultHomeHero;
  } catch {
    return defaultHomeHero;
  }
}

async function getTopSellingProducts(): Promise<Product[]> {
  try {
    const rankedItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "COMPLETED" } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 4
    });
    const productIds = rankedItems.map((item) => item.productId);
    if (!productIds.length) return [];

    const topProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    const productMap = new Map<string, Product>();
    topProducts.forEach((product) => {
      productMap.set(product.id, {
        ...product,
        price: product.price.toString(),
        salePrice: product.salePrice?.toString() ?? null,
        deliveryFee: product.deliveryFee.toString()
      });
    });

    const topSellingProducts: Product[] = [];
    productIds.forEach((id) => {
      const product = productMap.get(id);
      if (product) topSellingProducts.push(product);
    });
    return topSellingProducts;
  } catch {
    return [];
  }
}

function fillProductRow(products: Product[], featuredProducts: Product[]) {
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const fallbackProducts = products.filter((product) => !featuredIds.has(product.id));
  return [...featuredProducts, ...fallbackProducts].slice(0, 4);
}

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

export default async function HomePage() {
  const products = await getProducts();
  const brands = await getBrands();
  const categories = await getCategories();
  const hero = await getHomeHero();
  const topSellingProducts = await getTopSellingProducts();
  const productBrandNames = new Set(products.map((product) => product.brand).filter(Boolean));
  const displayBrands = brands.length
    ? brands.filter((brand) => productBrandNames.has(brand.name))
    : ["VERSACE", "ZARA", "GUCCI", "PRADA", "Calvin Klein"]
        .filter((name) => productBrandNames.has(name))
        .map((name, index) => ({ id: name, name, logoUrl: null, sortOrder: index, isActive: true }));
  const newArrivalProducts = fillProductRow(products, products.filter((product) => product.isNewArrival));
  const saleProducts = fillProductRow(products, products.filter((product) => product.isOnSale));
  const routineVideos = getRoutineVideosFromHero(hero);
  const categoryFallbackImages: Record<string, string> = {
    Skincare: "https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=900&auto=format&fit=crop",
    Makeup: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=900&auto=format&fit=crop",
    Fragrance: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=900&auto=format&fit=crop"
  };
  const routineCategories = (categories.length ? categories : ["Skincare", "Makeup", "Fragrance"].map((name, index) => ({ id: name, name, imageUrl: categoryFallbackImages[name], sortOrder: index, isActive: true }))).slice(0, 6);

  return (
    <>
      <section className="beauty-surface">
        <div className="container-page relative grid min-h-[650px] overflow-hidden py-10 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-0">
          <div className="relative z-10 py-8 md:py-16">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.38em] text-[#e9897e]">{hero.eyebrow}</p>
            <h1 className="max-w-2xl font-serif text-5xl font-bold leading-[0.98] text-[#082b4c] md:text-7xl lg:text-[76px]">{hero.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#697b91]">
              {hero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={hero.primaryHref} className="min-w-44 py-4">
                {hero.primaryLabel}
              </ButtonLink>
              <ButtonLink href={hero.secondaryHref} variant="outline" className="min-w-44 py-4">
                {hero.secondaryLabel}
              </ButtonLink>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {hero.stats.map((item) => (
                <div key={`${item.value}-${item.label}`} className="rounded-xl bg-white/70 p-3 shadow-sm">
                  <p className="text-2xl font-black text-[#082b4c]">{item.value}</p>
                  <p className="mt-1 text-xs text-[#697b91]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[460px] md:min-h-[650px]">
            <div className="absolute left-8 top-12 h-[78%] w-[78%] rounded-[48px] bg-white/55 shadow-soft" />
            <div className="absolute right-8 top-20 h-80 w-80 rounded-full bg-[#f8ded8]/80 blur-3xl" />
            <Image
              priority
              src={hero.imageUrl}
              alt={hero.imageAlt}
              fill
              unoptimized
              className="object-cover object-center mix-blend-multiply"
            />
            <div className="absolute bottom-10 left-4 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e9897e]">{hero.todayPickLabel}</p>
              <p className="mt-1 text-lg font-black text-[#082b4c]">{hero.todayPickTitle}</p>
            </div>
            <div className="absolute right-8 top-24 h-28 w-28 rounded-full border border-[#f3c7b8] bg-white/30 backdrop-blur" />
          </div>
        </div>
      </section>

      <section className="bg-[#082b4c] py-7 text-white">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-16 gap-y-6 text-center text-lg font-black tracking-[0.14em] text-white/90 md:text-2xl">
          {displayBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/shop?brand=${encodeURIComponent(brand.name)}`}
              className="group flex min-h-14 items-center gap-3 rounded-2xl px-3 transition hover:bg-white/10"
            >
              {brand.logoUrl && (
                <span className="block h-10 w-10 rounded-xl bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${brand.logoUrl})` }} />
              )}
              <span className="transition group-hover:text-[#ffdc1f]">{brand.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-center font-serif text-4xl font-bold text-[#082b4c]">New Beauty Arrivals</h2>
        <div className="mt-10">
          {newArrivalProducts.length ? (
            <ProductGrid products={newArrivalProducts} />
          ) : (
            <div className="rounded-2xl border border-[#f3c7b8]/70 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-xl font-bold text-[#082b4c]">No new arrivals yet</p>
              <p className="mt-2 text-sm text-[#697b91]">Add products in admin and mark them as new arrivals.</p>
            </div>
          )}
        </div>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-center font-serif text-4xl font-bold text-[#082b4c]">Top Selling Product</h2>
        <div className="mt-10">
          {topSellingProducts.length ? (
            <ProductGrid products={topSellingProducts} />
          ) : (
            <div className="rounded-2xl border border-[#f3c7b8]/70 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-xl font-bold text-[#082b4c]">No top selling products yet</p>
              <p className="mt-2 text-sm text-[#697b91]">Completed orders will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-center font-serif text-4xl font-bold text-[#082b4c]">On Sale</h2>
        <div className="mt-10">
          {saleProducts.length ? (
            <ProductGrid products={saleProducts} />
          ) : (
            <div className="rounded-2xl border border-[#f3c7b8]/70 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-xl font-bold text-[#082b4c]">No sale products yet</p>
              <p className="mt-2 text-sm text-[#697b91]">Add products in admin and mark them as on sale.</p>
            </div>
          )}
        </div>
      </section>

      <section className="container-page mt-20 rounded-[32px] bg-white/55 p-5 shadow-sm md:p-8">
        <h2 className="text-center font-serif text-4xl font-bold text-[#082b4c]">Browse By Routine</h2>
        {routineVideos.length ? (
          <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
            {routineVideos.map((video, index) => (
              <article
                key={video.id || `${video.videoUrl}-${index}`}
                className="min-w-[min(90vw,860px)] snap-start overflow-hidden rounded-[28px] border border-[#f3c7b8]/70 bg-[#fff8f3] shadow-sm md:min-w-[860px]"
              >
                <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                  <video
                    className="aspect-video h-full w-full bg-[#082b4c] object-cover"
                    controls
                    preload="metadata"
                    poster={video.posterUrl}
                  >
                    <source src={video.videoUrl} type="video/mp4" />
                  </video>
                  <div className="flex flex-col justify-center p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e9897e]">{video.eyebrow}</p>
                        <h3 className="mt-3 text-2xl font-black text-[#082b4c]">{video.title}</h3>
                        {video.brand ? (
                          <p className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#082b4c] shadow-sm">
                            Brand: {video.brand}
                          </p>
                        ) : null}
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
                    <p className="mt-3 text-sm leading-6 text-[#697b91]">{video.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-[#f3c7b8]/70 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-xl font-bold text-[#082b4c]">No routine videos yet</p>
            <p className="mt-2 text-sm text-[#697b91]">Add videos from the admin Routine Video menu.</p>
          </div>
        )}
        <RoutineCarousel categories={routineCategories} fallbackImages={categoryFallbackImages} />
      </section>

      <section className="container-page mt-20">
        <h2 className="text-center font-serif text-4xl font-bold text-[#082b4c]">Our Happy Customers</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {["Soft finish and beautiful packaging.", "My skincare order arrived fast.", "The shades feel premium and clean."].map((quote, index) => (
            <div key={quote} className="rounded-2xl border border-[#f3c7b8]/70 bg-white p-6 shadow-sm">
              <p className="text-xl text-[#e9897e]">★★★★★</p>
              <p className="mt-4 font-bold">{["Sarah M.", "Alex K.", "Mina R."][index]}</p>
              <p className="mt-2 text-sm leading-6 text-[#697b91]">{quote}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

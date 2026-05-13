import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-grid";
import { RoutineCarousel } from "@/components/routine-carousel";
import { RoutineVideoSlider } from "@/components/routine-video-slider";
import { Brand, Product } from "@/lib/types";
import { defaultHomeHero, getRoutinePostersFromHero, getRoutineVideosFromHero, HomeHero } from "@/lib/home-hero";
import { prisma } from "@/lib/prisma";
import { readSiteSetting } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

function ShelfSection({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page mt-14 md:mt-20">
      <div className="md:rounded-[34px] md:border md:border-[#dce6ff] md:bg-[linear-gradient(135deg,#ffffff_0%,#f4f8ff_55%,#fff8f3_100%)] md:px-8 md:py-9 md:shadow-[0_20px_60px_rgba(33,96,255,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ef8d79] md:text-xs md:tracking-[0.34em]">{eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#173e82] md:mt-3 md:text-5xl">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6f86a7] md:mt-4 md:leading-7 md:text-base">{description}</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="h-px w-14 bg-[#d3ddf8]" />
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#4c76ef] shadow-sm">
              Shop Edit
            </span>
          </div>
        </div>
        <div className="mt-6 md:mt-10">{children}</div>
      </div>
    </section>
  );
}

async function getProducts(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" }
    });
    return products.map((product) => ({
      ...product,
      price: product.price.toString(),
      salePrice: product.salePrice?.toString() ?? null,
      deliveryFee: product.deliveryFee.toString()
    }));
  } catch {
    return [];
  }
}

async function getBrands(): Promise<Brand[]> {
  try {
    return await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  } catch {
    return [];
  }
}

async function getHomeHero(): Promise<HomeHero> {
  try {
    return await readSiteSetting("homeHero", defaultHomeHero);
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
  return [...featuredProducts, ...fallbackProducts];
}

export default async function HomePage() {
  const products = await getProducts();
  const brands = await getBrands();
  const hero = await getHomeHero();
  const topSellingProducts = await getTopSellingProducts();
  const productBrandNames = new Set(products.map((product) => product.brand).filter(Boolean));
  const displayBrands = brands.length
    ? brands
    : ["VERSACE", "ZARA", "GUCCI", "PRADA", "Calvin Klein"]
        .filter((name) => productBrandNames.has(name))
        .map((name, index) => ({ id: name, name, logoUrl: null, sortOrder: index, isActive: true }));
  const newArrivalProducts = fillProductRow(products, products.filter((product) => product.isNewArrival));
  const saleProducts = fillProductRow(products, products.filter((product) => product.isOnSale));
  const routineVideos = getRoutineVideosFromHero(hero);
  const routinePosters = getRoutinePostersFromHero(hero);

  return (
    <>
      <section className="beauty-surface">
        <div className="container-page relative grid min-h-[650px] overflow-hidden py-10 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-0">
          <div className="relative z-10 py-8 md:py-16">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.38em] text-[var(--champagne-dark)]">{hero.eyebrow}</p>
            <h1 className="max-w-2xl font-serif text-5xl font-bold leading-[0.98] text-[var(--foreground)] md:text-7xl lg:text-[76px]">{hero.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">
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
                <div key={`${item.value}-${item.label}`} className="frontend-card rounded-xl p-3">
                  <p className="text-2xl font-black text-[var(--foreground)]">{item.value}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[460px] md:min-h-[650px]">
            <div className="absolute left-8 top-12 h-[78%] w-[78%] rounded-[48px] bg-white/55 shadow-soft" />
            <div className="absolute right-8 top-20 h-80 w-80 rounded-full bg-[rgba(76,118,239,0.22)] blur-3xl" />
            <Image
              priority
              src={hero.imageUrl}
              alt={hero.imageAlt}
              fill
              unoptimized
              className="object-cover object-center mix-blend-multiply"
            />
            <div className="absolute bottom-10 left-4 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-soft backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--champagne-dark)]">{hero.todayPickLabel}</p>
              <p className="mt-1 text-lg font-black text-[var(--foreground)]">{hero.todayPickTitle}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--navy)] py-7 text-white">
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
              <span className="transition group-hover:text-[#d8e2ff]">{brand.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <ShelfSection
        eyebrow="Fresh Drops"
        title="New Beauty Arrivals"
        description="A more curated shelf of the latest products, with cleaner cards, stronger pricing, and a softer luxury beauty feel."
      >
          {newArrivalProducts.length ? (
            <ProductGrid products={newArrivalProducts} />
          ) : (
            <div className="frontend-card rounded-2xl px-6 py-12 text-center">
              <p className="text-xl font-bold text-[var(--foreground)]">No new arrivals yet</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Add products in admin and mark them as new arrivals.</p>
            </div>
          )}
      </ShelfSection>

      <ShelfSection
        eyebrow="Best Loved"
        title="Top Selling Products"
        description="The products customers keep coming back for, surfaced with a cleaner layout and stronger product-first presentation."
      >
          {topSellingProducts.length ? (
            <ProductGrid products={topSellingProducts} />
          ) : (
            <div className="frontend-card rounded-2xl px-6 py-12 text-center">
              <p className="text-xl font-bold text-[var(--foreground)]">No top selling products yet</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Completed orders will appear here automatically.</p>
            </div>
          )}
      </ShelfSection>

      <ShelfSection
        eyebrow="Price Edit"
        title="On Sale"
        description="High-impact offers presented in a more polished storefront shelf, so discounts feel intentional instead of noisy."
      >
          {saleProducts.length ? (
            <ProductGrid products={saleProducts} />
          ) : (
            <div className="frontend-card rounded-2xl px-6 py-12 text-center">
              <p className="text-xl font-bold text-[var(--foreground)]">No sale products yet</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Add products in admin and mark them as on sale.</p>
            </div>
          )}
      </ShelfSection>

      <section className="frontend-card container-page mt-20 rounded-[32px] p-5 md:p-8">
        <h2 className="text-center font-serif text-4xl font-bold text-[var(--foreground)]">Browse By Routine</h2>
        {routineVideos.length ? (
          <div className="mt-8">
            <RoutineVideoSlider videos={routineVideos} />
          </div>
        ) : (
          <div className="frontend-panel mt-8 rounded-2xl px-6 py-12 text-center">
            <p className="text-xl font-bold text-[var(--foreground)]">No routine videos yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Add videos from the admin Routine Video menu.</p>
          </div>
        )}
        {routinePosters.length ? (
          <RoutineCarousel posters={routinePosters} />
        ) : (
          <div className="frontend-panel mt-8 rounded-2xl px-6 py-12 text-center">
            <p className="text-xl font-bold text-[var(--foreground)]">No routine posters yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Add posters from the admin Routine Poster menu.</p>
          </div>
        )}
      </section>

    </>
  );
}

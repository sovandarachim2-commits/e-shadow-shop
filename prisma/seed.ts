import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const seedDemoData = String(process.env.SEED_DEMO_DATA || "false").toLowerCase() === "true";

  const password = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@eshadow.com" },
    update: { username: "admin" },
    create: { name: "Store Admin", username: "admin", email: "admin@eshadow.com", password, role: Role.ADMIN }
  });

  if (!seedDemoData) {
    console.log("Seed complete: admin user only (demo data skipped).");
    return;
  }

  const products = [
    ["Hydrating Glow Serum", "Lightweight daily serum for a soft, dewy complexion.", 39, null, 0, 40, "VERSACE", "Skincare", "Glow", "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1200&auto=format&fit=crop", false, true, null],
    ["Velvet Matte Lipstick", "Smooth high-pigment color with a soft matte finish.", 29, 22, 1, 32, "GUCCI", "Makeup", "Lips", "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=1200&auto=format&fit=crop", true, false, "24% OFF"],
    ["Rose Cloud Moisturizer", "Rich cream texture that leaves skin calm and smooth.", 49, null, 0, 24, "PRADA", "Skincare", "Hydrate", "https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=1200&auto=format&fit=crop", false, true, null],
    ["Champagne Glow Palette", "Soft shimmer shades for warm, luminous makeup looks.", 59, 45, 2, 30, "Calvin Klein", "Makeup", "Glow", "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1200&auto=format&fit=crop", true, false, "SALE"]
  ];

  for (const [name, description, price, salePrice, deliveryFee, stock, brand, category, style, imageUrl, isOnSale, isNewArrival, promotionLabel] of products) {
    await prisma.product.upsert({
      where: { name: String(name) },
      update: {
        salePrice: salePrice === null ? null : Number(salePrice),
        deliveryFee: Number(deliveryFee),
        brand: String(brand),
        isOnSale: Boolean(isOnSale),
        isNewArrival: Boolean(isNewArrival),
        promotionLabel: promotionLabel === null ? null : String(promotionLabel)
      },
      create: {
        name: String(name),
        description: String(description),
        price: Number(price),
        salePrice: salePrice === null ? null : Number(salePrice),
        deliveryFee: Number(deliveryFee),
        stock: Number(stock),
        brand: String(brand),
        category: String(category),
        style: String(style),
        imageUrl: String(imageUrl),
        isOnSale: Boolean(isOnSale),
        isNewArrival: Boolean(isNewArrival),
        promotionLabel: promotionLabel === null ? null : String(promotionLabel)
      }
    });
  }

  for (const [index, name] of ["VERSACE", "ZARA", "GUCCI", "PRADA", "Calvin Klein"].entries()) {
    await prisma.brand.upsert({
      where: { name },
      update: { sortOrder: index + 1, isActive: true },
      create: { name, sortOrder: index + 1, isActive: true }
    });
  }

  for (const [index, name] of ["Skincare", "Makeup", "Fragrance"].entries()) {
    await prisma.category.upsert({
      where: { name },
      update: { sortOrder: index + 1, isActive: true },
      create: { name, sortOrder: index + 1, isActive: true }
    });
  }

  console.log("Seed complete: admin user and demo catalog data.");
}

main().finally(() => prisma.$disconnect());

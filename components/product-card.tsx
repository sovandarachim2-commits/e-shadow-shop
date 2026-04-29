"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useToastStore } from "@/lib/toast-store";

export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const toast = useToastStore((state) => state.push);
  const activeSalePrice = product.isOnSale && product.salePrice ? Number(product.salePrice) : null;
  const discountPercent = activeSalePrice ? Math.round(((Number(product.price) - activeSalePrice) / Number(product.price)) * 100) : null;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#f3c7b8]/70 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <Link href={`/products/${product.id}`} className="relative block aspect-[4/5] overflow-hidden bg-[#fff8f3]">
        <Image src={product.imageUrl} alt={product.name} width={700} height={900} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {(product.isOnSale || product.isNewArrival) && (
          <span className="absolute left-3 top-3 rounded-full bg-[#fff8f3]/95 px-3 py-1 text-xs font-black text-[#e9897e] shadow-sm">
            {product.isOnSale ? product.promotionLabel || "SALE" : "NEW"}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex flex-1 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-bold leading-5 text-[#082b4c] transition hover:text-[#e9897e] sm:text-base sm:leading-6">
              {product.name}
            </Link>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-[#e9897e] sm:text-xs">{product.brand || "No brand"}</p>
            <p className="mt-1 truncate text-xs font-semibold text-[#697b91]">{product.category}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-[#082b4c] sm:text-base">{money(activeSalePrice ?? product.price)}</p>
            {activeSalePrice && (
              <p className="text-[10px] text-neutral-400 sm:text-xs">
                <span className="line-through">{money(product.price)}</span>
                {discountPercent ? <span className="ml-1 text-[#e9897e]">-{discountPercent}%</span> : null}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            add(activeSalePrice ? { ...product, price: activeSalePrice } : product);
            toast("Added to cart");
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#082b4c] px-3 text-sm font-bold text-white transition hover:bg-[#0d3a64] sm:h-12 sm:px-4"
        >
          <ShoppingBag size={16} />
          Add
        </button>
      </div>
    </div>
  );
}

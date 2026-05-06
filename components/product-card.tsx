"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useToastStore } from "@/lib/toast-store";

export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const toast = useToastStore((state) => state.push);
  const activeSalePrice = product.isOnSale && product.salePrice ? Number(product.salePrice) : null;
  const discountPercent = activeSalePrice ? Math.round(((Number(product.price) - activeSalePrice) / Number(product.price)) * 100) : null;
  const showDiscountBadge = discountPercent !== null && discountPercent > 0 && discountPercent < 100;
  const [showDeliveryFee, setShowDeliveryFee] = useState(false);
  const [deliveryLabel, setDeliveryLabel] = useState(money(product.deliveryFee || 0));
  const deliveryText = `Delivery: ${deliveryLabel}`;

  useEffect(() => {
    fetch("/api/settings/delivery-display")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setShowDeliveryFee(Boolean(data.deliveryDisplay?.productVisibility?.[product.id]));
        setDeliveryLabel(data.deliveryDisplay?.productLabels?.[product.id] || money(product.deliveryFee || 0));
      })
      .catch(() => {
        setShowDeliveryFee(false);
        setDeliveryLabel(money(product.deliveryFee || 0));
      });
  }, [product.deliveryFee, product.id]);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-[#dce6ff] bg-white shadow-[0_10px_24px_rgba(33,96,255,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(33,96,255,0.12)] sm:rounded-[28px] sm:bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] sm:hover:-translate-y-1.5">
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden bg-[#f4f7ff] sm:aspect-[4/5] sm:bg-[radial-gradient(circle_at_top,#fff9f5_0%,#eef4ff_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_42%,rgba(14,40,92,0.08)_100%)]" />
        <Image src={product.imageUrl} alt={product.name} width={700} height={900} className="relative z-[1] h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        {(product.isOnSale || product.isNewArrival) && (
          <span className="absolute left-2 top-2 z-[2] rounded-full border border-white/90 bg-white/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#2e57d0] shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[11px]">
            {product.isOnSale ? product.promotionLabel || "SALE" : "NEW"}
          </span>
        )}
        {showDiscountBadge ? (
          <span className="absolute right-2 top-2 z-[2] rounded-full bg-[#ffede8] px-2 py-0.5 text-[9px] font-black text-[#d56d55] shadow-sm sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
            -{discountPercent}%
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.14em] text-[#ef8d79] sm:text-[10px] sm:tracking-[0.22em]">
              {product.style || "Beauty Pick"}
            </p>
            <div className="shrink-0 text-right">
              <p className="text-[0.92rem] font-black leading-none text-[#173e82] sm:text-lg">{money(activeSalePrice ?? product.price)}</p>
              {activeSalePrice && (
                <p className="mt-1 text-[9px] text-neutral-400 sm:text-[11px]">
                  <span className="line-through">{money(product.price)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <Link href={`/products/${product.id}`} className="line-clamp-2 min-h-[38px] text-[1rem] font-black leading-[1.18] text-[#173e82] transition hover:text-[#2e57d0] sm:min-h-0 sm:text-[1.08rem] sm:leading-6">
              {product.name}
            </Link>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-[#6f86a7] sm:mt-2 sm:text-xs sm:tracking-[0.2em]">{product.brand || "No brand"}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-[#8193ad] sm:mt-1 sm:text-sm">{product.category}</p>
          </div>
          <div className="mt-2.5 flex min-h-5 items-center justify-between gap-2 sm:mt-3">
            {showDeliveryFee ? (
              <p className="truncate text-[10px] font-black text-[#355fb3] sm:text-xs">{deliveryText}</p>
            ) : <span />}
            <span className="hidden rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#355fb3] sm:inline-flex sm:px-3 sm:text-[11px]">
              Ready
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            add(activeSalePrice ? { ...product, price: activeSalePrice } : product);
            toast("Added to cart");
          }}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#173e82_0%,#2f5ef1_100%)] px-3 text-sm font-black text-white shadow-[0_10px_20px_rgba(33,96,255,0.16)] transition hover:brightness-105 sm:mt-5 sm:h-12 sm:px-4 sm:shadow-[0_12px_24px_rgba(33,96,255,0.18)]"
        >
          <ShoppingBag size={14} />
          Add
        </button>
      </div>
    </div>
  );
}

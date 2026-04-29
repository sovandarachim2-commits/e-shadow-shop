"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useToastStore } from "@/lib/toast-store";
import { Product } from "@/lib/types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const add = useCartStore((state) => state.add);
  const toast = useToastStore((state) => state.push);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setProduct(data.product))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container-page py-16">Loading product...</div>;
  if (!product) {
    return (
      <div className="container-page py-16">
        <div className="rounded-2xl border border-[#f3c7b8]/70 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-xl font-bold text-[#082b4c]">Product not found</p>
          <p className="mt-2 text-sm text-[#697b91]">This product is not available in the database.</p>
        </div>
      </div>
    );
  }
  const activeSalePrice = product.isOnSale && product.salePrice ? Number(product.salePrice) : null;

  return (
    <section className="container-page grid gap-10 py-12 md:grid-cols-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#fff8f3] shadow-soft">
        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-sm uppercase tracking-[0.2em] text-[#e9897e]">{product.brand || "No brand"}</p>
        <p className="mt-2 text-sm font-bold text-[#697b91]">{product.category}</p>
        <h1 className="mt-3 font-serif text-5xl font-bold text-[#082b4c]">{product.name}</h1>
        <div className="mt-4 flex items-end gap-3">
          <p className="text-3xl font-black text-[#082b4c]">{money(activeSalePrice ?? product.price)}</p>
          {activeSalePrice && <p className="pb-1 text-lg text-neutral-400 line-through">{money(product.price)}</p>}
          {product.isNewArrival && <span className="rounded-full bg-[#f8ded8] px-3 py-1 text-xs font-black text-[#e9897e]">NEW</span>}
        </div>
        <p className="mt-5 max-w-xl leading-7 text-[#697b91]">{product.description}</p>
        <div className="mt-8 flex w-fit items-center gap-3 rounded-2xl bg-[#fff8f3] p-2">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded-xl p-2 transition hover:bg-white">
            <Minus size={18} />
          </button>
          <span className="w-8 text-center font-bold">{quantity}</span>
          <button onClick={() => setQuantity(quantity + 1)} className="rounded-xl p-2 transition hover:bg-white">
            <Plus size={18} />
          </button>
        </div>
        <Button
          className="mt-6 w-full md:w-fit"
          onClick={() => {
            add(activeSalePrice ? { ...product, price: activeSalePrice } : product, quantity);
            toast("Added to cart");
          }}
        >
          <ShoppingBag size={18} />
          Add to cart
        </Button>
      </div>
    </section>
  );
}

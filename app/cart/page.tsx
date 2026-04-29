"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { money } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const update = useCartStore((state) => state.update);
  const remove = useCartStore((state) => state.remove);
  const total = useCartStore((state) => state.total());
  const user = useAuthStore((state) => state.user);

  return (
    <section className="container-page py-12">
      <h1 className="font-serif text-5xl font-bold text-[#082b4c]">Your Cart</h1>
      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#f3c7b8]/70 bg-white p-10 text-center">
          <p className="text-[#697b91]">Your cart is empty.</p>
          <ButtonLink href="/shop" className="mt-5">
            Continue shopping
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[96px_1fr] gap-4 rounded-2xl border border-[#f3c7b8]/70 bg-white p-4">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#fff8f3]">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <Link href={`/products/${item.id}`} className="font-bold text-[#082b4c]">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-[#697b91]">{money(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => update(item.id, item.quantity - 1)} className="rounded-xl bg-[#fff8f3] p-2 text-[#082b4c]">
                      <Minus size={16} />
                    </button>
                    <span className="w-7 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => update(item.id, item.quantity + 1)} className="rounded-xl bg-[#fff8f3] p-2 text-[#082b4c]">
                      <Plus size={16} />
                    </button>
                    <button onClick={() => remove(item.id)} className="rounded-xl p-2 text-red-600 transition hover:bg-red-50">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit rounded-2xl border border-[#f3c7b8]/70 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-[#082b4c]">Order Summary</h2>
            <div className="mt-5 flex justify-between text-[#697b91]">
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>
            <div className="mt-3 flex justify-between text-[#697b91]">
              <span>Delivery</span>
              <span>Free</span>
            </div>
            <div className="mt-5 flex justify-between border-t border-[#f3c7b8] pt-5 text-xl font-black text-[#082b4c]">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <ButtonLink href={user ? "/checkout" : "/login?redirect=/checkout"} className="mt-6 w-full">
              {user ? "Checkout" : "Login to checkout"}
            </ButtonLink>
          </aside>
        </div>
      )}
    </section>
  );
}

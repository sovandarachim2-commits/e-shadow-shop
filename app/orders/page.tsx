"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock3, MapPin, PackageCheck, ReceiptText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

type OrderItem = {
  id: string;
  quantity: number;
  price: number | string;
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    imageUrl: string;
  };
};

type Order = {
  id: string;
  status: string;
  total: number | string;
  deliveryFee: number | string;
  paymentMethod: string;
  customerName: string;
  phone: string;
  address: string;
  province?: string | null;
  note?: string | null;
  contactTelegram?: boolean;
  createdAt: string;
  items: OrderItem[];
};

const statusTone: Record<string, string> = {
  PENDING: "bg-[#fff4e8] text-[#b8661c]",
  COMPLETED: "bg-[#edf8ef] text-[#2d7a47]",
  CANCELLED: "bg-[#fff0f0] text-[#c55252]",
  PROCESSING: "bg-[#eef4ff] text-[#355fb3]"
};

export default function OrdersPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  useEffect(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/orders", { headers })
      .then((response) => {
        if (response.status === 401) {
          router.push("/login?redirect=/orders");
          return Promise.reject();
        }
        return response.ok ? response.json() : Promise.reject();
      })
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [router, token]);

  return (
    <section className="beauty-surface min-h-[calc(100vh-80px)] py-12">
      {selectedOrder ? (
        <div className="fixed inset-0 z-[90] bg-[#f5f7fb] md:flex md:items-center md:justify-center md:bg-[#082b4c]/35 md:px-4 md:py-4 md:backdrop-blur-[2px]">
          <div className="flex h-full w-full flex-col overflow-hidden bg-[#f5f7fb] md:h-auto md:max-h-[92vh] md:max-w-3xl md:rounded-[36px] md:bg-white md:shadow-2xl">
            <div className="bg-gradient-to-b from-[#ff6e8a] to-[#ff7f93] px-5 pb-6 pt-5 text-white md:px-6">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setSelectedOrder(null)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl font-light md:hidden">
                  {"<"}
                </button>
                <h2 className="flex-1 text-center text-2xl font-black md:text-left">Order Details</h2>
                <button type="button" onClick={() => setSelectedOrder(null)} className="hidden rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#082b4c] md:inline-flex">
                  <X size={16} />
                  Close
                </button>
              </div>
              <p className="mt-4 text-sm font-bold text-white/90">Order #{selectedOrder.id.slice(-8)}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7fb] px-3 py-3 md:px-6 md:py-6">
              <div className="rounded-[28px] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full px-4 py-2 text-sm font-black ${statusTone[selectedOrder.status] || "bg-[#fff8f3] text-[#082b4c]"}`}>
                    {selectedOrder.status}
                  </span>
                  <span className="text-3xl font-black text-[#082b4c]">{money(selectedOrder.total)}</span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#8b99aa]">
                  <Clock3 size={16} />
                  {new Date(selectedOrder.createdAt).toLocaleDateString()} {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-lg font-black text-[#082b4c]">
                    <ReceiptText size={20} />
                    Ordered Items
                  </p>
                  <span className="text-sm font-black text-[#8b99aa]">{selectedOrder.items.length} item{selectedOrder.items.length === 1 ? "" : "s"}</span>
                </div>

                <div className="mt-5 grid gap-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[80px_1fr_auto] gap-4 rounded-[22px] bg-[#fff8f3] p-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-[18px] bg-white">
                        {item.product?.imageUrl ? <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="80px" className="object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-lg font-black text-[#082b4c]">{item.product?.name || "Product"}</p>
                        <p className="mt-1 text-sm text-[#8b99aa]">{item.product?.brand || "No brand"}</p>
                        <p className="mt-3 text-2xl font-black text-[#082b4c]">x{item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#082b4c]">{money(Number(item.price) * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-[#f4e7df] pt-4">
                  <div className="flex items-center justify-between text-sm font-bold text-[#8b99aa]">
                    <span>Delivery fee</span>
                    <span>{money(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-2xl font-black text-[#082b4c]">
                    <span>Total</span>
                    <span>{money(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
                <p className="flex items-center gap-2 text-lg font-black text-[#082b4c]">
                  <MapPin size={20} />
                  Delivery Information
                </p>
                <div className="mt-5 grid gap-4 text-sm">
                  <div className="grid gap-1">
                    <p className="font-black text-[#8b99aa]">Recipient</p>
                    <p className="text-xl font-black text-[#082b4c]">{selectedOrder.customerName}, {selectedOrder.phone}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-black text-[#8b99aa]">Address</p>
                    <p className="text-lg font-black text-[#082b4c]">{selectedOrder.address}{selectedOrder.province ? `, ${selectedOrder.province}` : ""}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-black text-[#8b99aa]">Payment</p>
                    <p className="text-lg font-black text-[#082b4c]">{selectedOrder.paymentMethod}</p>
                  </div>
                  {selectedOrder.note ? (
                    <div className="grid gap-1">
                      <p className="font-black text-[#8b99aa]">Note</p>
                      <p className="text-base font-bold text-[#082b4c]">{selectedOrder.note}</p>
                    </div>
                  ) : null}
                  <div className="grid gap-1">
                    <p className="font-black text-[#8b99aa]">Telegram Contact</p>
                    <p className="text-base font-bold text-[#082b4c]">{selectedOrder.contactTelegram ? "Requested" : "Not requested"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
                <p className="flex items-center gap-2 text-lg font-black text-[#082b4c]">
                  <ReceiptText size={20} />
                  Order Information
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-[#fff8f3] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9aa7b8]">Order ID</p>
                    <p className="mt-2 break-all text-lg font-black text-[#082b4c]">{selectedOrder.id}</p>
                  </div>
                  <div className="rounded-[22px] bg-[#fff8f3] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9aa7b8]">Payment Method</p>
                    <p className="mt-2 text-lg font-black text-[#082b4c]">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div className="rounded-[22px] bg-[#fff8f3] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9aa7b8]">Placed On</p>
                    <p className="mt-2 text-lg font-black text-[#082b4c]">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-[22px] bg-[#fff8f3] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9aa7b8]">Placed Time</p>
                    <p className="mt-2 text-lg font-black text-[#082b4c]">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
                <p className="flex items-center gap-2 text-lg font-black text-[#082b4c]">
                  <ReceiptText size={20} />
                  Payment Summary
                </p>
                <div className="mt-5 grid gap-4">
                  <div className="flex items-center justify-between rounded-[22px] bg-[#fff8f3] px-4 py-4 text-base font-bold text-[#697b91]">
                    <span>Subtotal</span>
                    <span className="text-[#082b4c]">
                      {money(
                        selectedOrder.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] bg-[#fff8f3] px-4 py-4 text-base font-bold text-[#697b91]">
                    <span>Delivery Fee</span>
                    <span className="text-[#082b4c]">{money(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] bg-[#082b4c] px-4 py-4 text-lg font-black text-white">
                    <span>Total Paid</span>
                    <span>{money(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="container-page">
        <div className="rounded-[36px] bg-white px-6 py-7 shadow-sm md:px-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#e9897e]">Account</p>
          <h1 className="mt-3 font-serif text-5xl font-bold text-[#082b4c]">Order History</h1>
          <p className="mt-3 max-w-2xl text-[#697b91]">Track every checkout, review product items, and quickly see the latest status of each order.</p>
        </div>

        <div className="mt-10 grid gap-5">
          {loading ? (
            <div className="rounded-[32px] bg-white p-8 text-[#697b91] shadow-sm">Loading orders...</div>
          ) : !orders.length ? (
            <div className="rounded-[32px] bg-white p-10 text-center shadow-sm">
              <PackageCheck className="mx-auto text-[#e9897e]" size={42} />
              <p className="mt-4 text-xl font-black text-[#082b4c]">No orders yet</p>
              <p className="mt-2 text-sm text-[#697b91]">After checkout, your orders will appear here.</p>
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="overflow-hidden rounded-[32px] bg-white shadow-sm">
                <div className="border-b border-[#f4e7df] px-5 py-4 md:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${statusTone[order.status] || "bg-[#fff8f3] text-[#082b4c]"}`}>
                        <ReceiptText size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-black text-[#082b4c]">Order #{order.id.slice(-8)}</p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[#697b91]">
                          {order.status}
                          <ChevronRight size={14} />
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#9aa7b8]">{order.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5 md:px-6">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {order.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.product ? `/products/${item.product.id}` : "/shop"}
                        className="block w-[112px] shrink-0"
                      >
                        <div className="relative h-24 w-24 overflow-hidden rounded-[22px] bg-[#fff8f3]">
                          {item.product?.imageUrl ? (
                            <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="96px" className="object-cover" />
                          ) : null}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-black text-[#082b4c]">{item.product?.name || "Product"}</p>
                        <p className="mt-1 text-sm text-[#697b91]">x {item.quantity}</p>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-4 border-t border-[#f4e7df] pt-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-[#8b99aa]">
                      <span className="flex items-center gap-2">
                        <Clock3 size={16} />
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                      </span>
                      <span>{order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                      <span className="text-lg font-black text-[#082b4c]">{money(order.total)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[#ff8a7b] px-6 text-sm font-black text-[#ff6c5d] transition hover:bg-[#fff4ef]"
                    >
                      View order details
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

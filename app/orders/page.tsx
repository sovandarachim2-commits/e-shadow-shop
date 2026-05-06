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
  paymentStatus?: "COMPLETED" | "PENDING";
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
  PENDING: "border border-[#ffd7aa] bg-[#fff3e2] text-[#b96a17]",
  COMPLETED: "border border-[#cfe8d7] bg-[#edf9f1] text-[#27734a]",
  CANCELLED: "border border-[#f5caca] bg-[#fff1f1] text-[#be4d4d]",
  PROCESSING: "border border-[#d7e2ff] bg-[#eef3ff] text-[#355fb3]"
};

const paymentTone: Record<string, string> = {
  COMPLETED: "border border-[#cfe8d7] bg-[#edf9f1] text-[#27734a]",
  PENDING: "border border-[#ffd7aa] bg-[#fff3e2] text-[#b96a17]"
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
          <div className="flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f5f8ff_0%,#eef3ff_100%)] md:h-auto md:max-h-[92vh] md:max-w-3xl md:rounded-[36px] md:border md:border-white/70 md:bg-white md:shadow-2xl">
            <div className="bg-[linear-gradient(135deg,#2e4fc3_0%,#2160ff_58%,#6c8dff_100%)] px-5 pb-6 pt-5 text-white md:px-6">
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

            <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f5f8ff_0%,#eef3ff_100%)] px-3 py-3 md:px-6 md:py-6">
              <div className="rounded-[28px] border border-[#dfe8ff] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_42px_rgba(33,96,255,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full px-4 py-2 text-sm font-black ${statusTone[selectedOrder.status] || "bg-[#fff8f3] text-[#082b4c]"}`}>
                    {selectedOrder.status}
                  </span>
                  <span className="text-3xl font-black text-[#123b7a]">{money(selectedOrder.total)}</span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#7f92ac]">
                  <Clock3 size={16} />
                  {new Date(selectedOrder.createdAt).toLocaleDateString()} {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#dfe8ff] bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_18px_42px_rgba(33,96,255,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-lg font-black text-[#123b7a]">
                    <ReceiptText size={20} />
                    Ordered Items
                  </p>
                  <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-sm font-black text-[#4d6ea8]">{selectedOrder.items.length} item{selectedOrder.items.length === 1 ? "" : "s"}</span>
                </div>

                <div className="mt-5 grid gap-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[80px_1fr_auto] gap-4 rounded-[24px] border border-[#f4e7df] bg-[linear-gradient(135deg,#fffaf6_0%,#fff5ee_100%)] p-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-[18px] border border-white bg-white shadow-[0_10px_24px_rgba(8,43,76,0.08)]">
                        {item.product?.imageUrl ? <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="80px" className="object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-lg font-black text-[#123b7a]">{item.product?.name || "Product"}</p>
                        <p className="mt-1 text-sm text-[#7f92ac]">{item.product?.brand || "No brand"}</p>
                        <p className="mt-3 text-2xl font-black text-[#123b7a]">x{item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#123b7a]">{money(Number(item.price) * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-[#e7edf9] pt-4">
                  <div className="flex items-center justify-between text-sm font-bold text-[#7f92ac]">
                    <span>Delivery fee</span>
                    <span>{money(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-2xl font-black text-[#123b7a]">
                    <span>Total</span>
                    <span>{money(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#dfe8ff] bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_18px_42px_rgba(33,96,255,0.08)]">
                <p className="flex items-center gap-2 text-lg font-black text-[#123b7a]">
                  <MapPin size={20} />
                  Delivery Information
                </p>
                <div className="mt-5 grid gap-4 text-sm">
                  <div className="grid gap-1">
                    <p className="font-black text-[#7f92ac]">Recipient</p>
                    <p className="text-xl font-black text-[#123b7a]">{selectedOrder.customerName}, {selectedOrder.phone}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-black text-[#7f92ac]">Address</p>
                    <p className="text-lg font-black text-[#123b7a]">{selectedOrder.address}{selectedOrder.province ? `, ${selectedOrder.province}` : ""}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-black text-[#7f92ac]">Payment</p>
                    <p className="text-lg font-black text-[#123b7a]">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-black text-[#7f92ac]">Payment Status</p>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-black ${paymentTone[selectedOrder.paymentStatus || "PENDING"]}`}>
                        {selectedOrder.paymentStatus === "COMPLETED" ? "Complete" : "Pending"}
                      </span>
                    </div>
                  </div>
                  {selectedOrder.note ? (
                    <div className="grid gap-1">
                      <p className="font-black text-[#7f92ac]">Note</p>
                      <p className="text-base font-bold text-[#123b7a]">{selectedOrder.note}</p>
                    </div>
                  ) : null}
                  <div className="grid gap-1">
                    <p className="font-black text-[#7f92ac]">Telegram Contact</p>
                    <p className="text-base font-bold text-[#123b7a]">{selectedOrder.contactTelegram ? "Requested" : "Not requested"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#dfe8ff] bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_18px_42px_rgba(33,96,255,0.08)]">
                <p className="flex items-center gap-2 text-lg font-black text-[#123b7a]">
                  <ReceiptText size={20} />
                  Order Information
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[#edf1fa] bg-[#f7faff] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8ea1bb]">Order ID</p>
                    <p className="mt-2 break-all text-lg font-black text-[#123b7a]">{selectedOrder.id}</p>
                  </div>
                  <div className="rounded-[22px] border border-[#f4e7df] bg-[#fff8f3] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#a08f84]">Payment Method</p>
                    <p className="mt-2 text-lg font-black text-[#123b7a]">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div className="rounded-[22px] border border-[#edf1fa] bg-[#f7faff] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8ea1bb]">Placed On</p>
                    <p className="mt-2 text-lg font-black text-[#123b7a]">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-[22px] border border-[#f4e7df] bg-[#fff8f3] px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#a08f84]">Placed Time</p>
                    <p className="mt-2 text-lg font-black text-[#123b7a]">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-[#dfe8ff] bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_18px_42px_rgba(33,96,255,0.08)]">
                <p className="flex items-center gap-2 text-lg font-black text-[#123b7a]">
                  <ReceiptText size={20} />
                  Payment Summary
                </p>
                <div className="mt-5 grid gap-4">
                  <div className="flex items-center justify-between rounded-[22px] border border-[#edf1fa] bg-[#f7faff] px-4 py-4 text-base font-bold text-[#6e83a2]">
                    <span>Subtotal</span>
                    <span className="text-[#123b7a]">
                      {money(
                        selectedOrder.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-[#f4e7df] bg-[#fff8f3] px-4 py-4 text-base font-bold text-[#8a7f78]">
                    <span>Delivery Fee</span>
                    <span className="text-[#123b7a]">{money(selectedOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[24px] bg-[linear-gradient(135deg,#173e82_0%,#2160ff_100%)] px-4 py-4 text-lg font-black text-white shadow-[0_20px_34px_rgba(33,96,255,0.24)]">
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
        <div className="rounded-[30px] bg-white px-5 py-5 shadow-sm md:rounded-[36px] md:px-8 md:py-7">
          <h1 className="font-serif text-[3.15rem] font-bold leading-[0.92] text-[#082b4c] sm:text-6xl md:text-5xl md:leading-none">Order History</h1>
        </div>

        <div className="mt-6 grid gap-4 md:mt-10 md:gap-5">
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

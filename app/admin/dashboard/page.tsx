"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes, DollarSign, LucideIcon, PackageCheck, ReceiptText, TrendingUp, Users } from "lucide-react";
import { money } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export default function AdminDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const [data, setData] = useState({ sales: 0, totalOrders: 0, products: [] as any[], customers: 0, recent: [] as any[], bestSellers: [] as any[] });

  useEffect(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch("/api/reports", { headers }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/products").then((r) => r.json()).catch(() => ({ products: [] })),
      fetch("/api/users?role=CUSTOMER", { headers }).then((r) => r.json()).catch(() => ({ users: [] })),
      fetch("/api/orders", { headers }).then((r) => r.json()).catch(() => ({ orders: [] }))
    ]).then(([reports, products, customers, orders]) =>
      setData({
        sales: reports.sales || 0,
        totalOrders: reports.totalOrders || 0,
        products: products.products || [],
        customers: customers.users?.length || 0,
        recent: orders.orders?.slice(0, 5) || [],
        bestSellers: reports.bestSellers || []
      })
    );
  }, [token]);

  const cards: Array<[string, string | number, LucideIcon, string]> = [
    ["Live revenue", money(data.sales), DollarSign, "bg-[#ffe7df] text-[#de745c]"],
    ["Today orders", data.totalOrders, ReceiptText, "bg-[#eaf6ff] text-[#2c95d8]"],
    ["New product", data.products.length, Boxes, "bg-[#fff5c4] text-[#d09d00]"],
    ["Customers", data.customers, Users, "bg-[#eaf8ef] text-[#22a35a]"]
  ];
  const stockTotal = data.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const stockAccuracy = data.products.length ? Math.min(99, Math.round((data.products.filter((product) => Number(product.stock || 0) > 0).length / data.products.length) * 100)) : 0;
  const featuredProducts = data.products.slice(0, 4);
  const topSeller = data.bestSellers[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, Icon, color]) => (
            <div key={String(label)} className="admin-card rounded-[22px] p-5">
              <div className="flex items-center justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}>
                  <Icon size={21} />
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600">+ 5%</span>
              </div>
              <p className="mt-5 text-sm font-black text-neutral-400">{String(label)}</p>
              <p className="mt-2 text-3xl font-black text-[#15130f]">{String(value)}</p>
            </div>
          ))}
        </div>

        <section className="admin-card rounded-[26px] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#15130f]">Total Product in Stock</h2>
              <p className="mt-1 text-sm text-neutral-500">{stockTotal} units available across {data.products.length} products</p>
            </div>
            <span className="flex items-center gap-2 text-sm font-black text-neutral-500">See more <ArrowRight size={17} /></span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {featuredProducts.map((product) => (
              <div key={product.id} className="admin-soft-card grid grid-cols-[92px_1fr_auto] items-center gap-4 rounded-[22px] p-4">
                <div className="relative h-24 overflow-hidden rounded-2xl bg-white">
                  <Image src={product.imageUrl} alt={product.name} fill sizes="92px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-[#15130f]">{product.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">Stock: <b className="text-[#15130f]">{product.stock}</b> | Sold: {topSeller?.name === product.name ? topSeller.quantity : 0}</p>
                  <p className="mt-3 text-xl font-black text-[#15130f]">{money(product.salePrice || product.price)}</p>
                </div>
                <ArrowRight size={20} className="text-neutral-400" />
              </div>
            ))}
            {!featuredProducts.length && <p className="text-sm text-neutral-500">No products yet.</p>}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="admin-card rounded-[26px] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#15130f]">Recent Orders</h2>
              <span className="text-sm font-black text-neutral-500">See more</span>
            </div>
            <div className="mt-4 grid gap-3">
              {data.recent.map((order) => (
                <div key={order.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ffdc1f] text-sm font-black text-[#15130f]">{order.customerName?.slice(0, 1) || "O"}</span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#15130f]">{order.customerName}</p>
                    <p className="text-sm text-neutral-500">{order.status}</p>
                  </div>
                  <span className="font-black text-[#15130f]">{money(order.total)}</span>
                </div>
              ))}
              {!data.recent.length && <p className="text-sm text-neutral-500">No orders yet.</p>}
            </div>
          </section>

          <section className="admin-card rounded-[26px] p-5">
            <h2 className="text-xl font-black text-[#15130f]">Stock Accuracy</h2>
            <div className="mt-8 grid place-items-center">
              <div className="relative grid h-48 w-48 place-items-center rounded-full bg-[conic-gradient(#ffdc1f_0deg,#ffdc1f_250deg,#fff5bf_250deg,#fff5bf_360deg)]">
                <div className="grid h-32 w-32 place-items-center rounded-full bg-white">
                  <div className="text-center">
                    <p className="text-4xl font-black text-[#15130f]">{stockAccuracy}%</p>
                    <p className="mt-1 text-xs font-black text-emerald-600">+ 5% vs last month</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <aside className="grid h-fit gap-5">
        <section className="admin-card rounded-[26px] p-5">
          <h2 className="text-xl font-black text-[#15130f]">Top Selling Product</h2>
          <div className="mt-7 flex items-center gap-3">
            <p className="text-4xl font-black text-[#15130f]">{topSeller?.quantity || 0}</p>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffdc1f] text-[#15130f]">
              <PackageCheck size={17} />
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-600">+ 5%</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full w-4/5 bg-[#e4775f]" />
          </div>
          <div className="mt-6 grid gap-3">
            {(data.bestSellers.slice(0, 3).length ? data.bestSellers.slice(0, 3) : [{ name: "Skincare" }, { name: "Makeup" }, { name: "Fragrance" }]).map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center gap-3 text-sm font-bold text-neutral-500">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${["bg-[#e4775f]", "bg-[#ffb31a]", "bg-[#ffdc1f]"][index]} text-[#15130f]`}>
                  <Boxes size={18} />
                </span>
                {item.name}
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card rounded-[26px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#15130f]">Live Revenue</h2>
            <TrendingUp size={21} className="text-emerald-600" />
          </div>
          <p className="mt-8 text-center text-4xl font-black text-[#15130f]">{money(data.sales)}</p>
          <p className="mt-2 text-center text-sm font-bold text-neutral-500"><span className="text-emerald-600">+ 5%</span> higher</p>
          <div className="mt-8 grid h-40 grid-cols-5 items-end gap-3 border-b border-dashed border-neutral-200">
            {[55, 26, 42, 34, 72].map((height, index) => (
              <span key={index} className="rounded-t-xl bg-[#ffdc1f]" style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

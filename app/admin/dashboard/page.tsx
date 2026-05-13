"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes, DollarSign, LucideIcon, PackageCheck, ReceiptText, TrendingUp, Users } from "lucide-react";
import { money } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export default function AdminDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
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
    ["Expense", money(data.sales * 0.42), DollarSign, "bg-[#eaf8ff] text-[#45bff0]"],
    ["Sales", money(data.sales), ReceiptText, "bg-[#eff2ff] text-[#2f4fdb]"],
    ["Products", data.products.length, Boxes, "bg-[#eefbff] text-[#28aee0]"],
    ["Customers", data.customers, Users, "bg-[#edf8f3] text-[#21b875]"]
  ];
  const stockTotal = data.products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const stockAccuracy = data.products.length ? Math.min(99, Math.round((data.products.filter((product) => Number(product.stock || 0) > 0).length / data.products.length) * 100)) : 0;
  const featuredProducts = data.products.slice(0, 4);
  const topSeller = data.bestSellers[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
      <div className="grid gap-5">
        <section className="admin-card overflow-hidden rounded-[28px] p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_250px] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#edf8ff] text-[#45bff0]">
                  <Users size={22} />
                </span>
                <h1 className="text-2xl font-black text-[#1d2530]">Welcome back {user?.name || "Admin"}!</h1>
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-black text-[#1d2530]">{money(data.sales)}</p>
                    <TrendingUp className="mb-1 text-[#38d8ad]" size={25} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#7d8ca2]">Today&apos;s Sales</p>
                </div>
                <div className="border-[#e7eef7] sm:border-l sm:pl-6">
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-black text-[#1d2530]">{stockAccuracy}%</p>
                    <TrendingUp className="mb-1 text-[#38d8ad]" size={25} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#7d8ca2]">Overall Performance</p>
                </div>
              </div>
            </div>
            <div className="relative hidden min-h-[180px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#eaf8ff,#ffffff)] lg:block">
              <div className="absolute bottom-6 left-8 h-24 w-24 rounded-full bg-[#55c7f2]/20" />
              <div className="absolute right-8 top-8 grid h-28 w-28 place-items-center rounded-[32px] bg-white shadow-[0_20px_44px_rgba(47,98,255,0.10)]">
                <PackageCheck size={50} className="text-[#2f4fdb]" />
              </div>
              <div className="absolute bottom-8 right-10 h-20 w-32 rounded-full bg-[#2f4fdb]/10 blur-2xl" />
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, Icon, color]) => (
            <div key={String(label)} className="admin-card rounded-[24px] p-5">
              <div className="flex items-center justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}>
                  <Icon size={21} />
                </span>
                <span className="rounded-full bg-[#ecfff9] px-2.5 py-1 text-xs font-black text-[#1fba80]">+ 2.5%</span>
              </div>
              <p className="mt-5 text-sm font-black text-[#8795a8]">{String(label)}</p>
              <p className="mt-2 text-3xl font-black text-[#1d2530]">{String(value)}</p>
            </div>
          ))}
        </div>

        <section className="admin-card rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#1d2530]">Total Product in Stock</h2>
              <p className="mt-1 text-sm text-[#7d8ca2]">{stockTotal} units available across {data.products.length} products</p>
            </div>
            <span className="flex items-center gap-2 text-sm font-black text-[#45bff0]">See more <ArrowRight size={17} /></span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {featuredProducts.map((product) => (
              <div key={product.id} className="admin-soft-card grid grid-cols-[92px_1fr_auto] items-center gap-4 rounded-[24px] p-4">
                <div className="relative h-24 overflow-hidden rounded-2xl bg-white">
                  <Image src={product.imageUrl} alt={product.name} fill sizes="92px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-[#1d2530]">{product.name}</p>
                  <p className="mt-1 text-sm text-[#7d8ca2]">Stock: <b className="text-[#1d2530]">{product.stock}</b> | Sold: {topSeller?.name === product.name ? topSeller.quantity : 0}</p>
                  <p className="mt-3 text-xl font-black text-[#1d2530]">{money(product.salePrice || product.price)}</p>
                </div>
                <ArrowRight size={20} className="text-[#9fb0c4]" />
              </div>
            ))}
            {!featuredProducts.length && <p className="text-sm text-[#7d8ca2]">No products yet.</p>}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="admin-card rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#1d2530]">Recent Orders</h2>
              <span className="text-sm font-black text-[#45bff0]">See more</span>
            </div>
            <div className="mt-4 grid gap-3">
              {data.recent.map((order) => (
                <div key={order.id} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-[#edf3fa] pb-3 last:border-0 last:pb-0">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eaf8ff] text-sm font-black text-[#45bff0]">{order.customerName?.slice(0, 1) || "O"}</span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#1d2530]">{order.customerName}</p>
                    <p className="text-sm text-[#7d8ca2]">{order.status}</p>
                  </div>
                  <span className="font-black text-[#1d2530]">{money(order.total)}</span>
                </div>
              ))}
              {!data.recent.length && <p className="text-sm text-[#7d8ca2]">No orders yet.</p>}
            </div>
          </section>

          <section className="admin-card rounded-[28px] p-5">
            <h2 className="text-xl font-black text-[#1d2530]">Sales Overview</h2>
            <div className="mt-8 grid place-items-center">
              <div className="relative grid h-48 w-48 place-items-center rounded-full bg-[conic-gradient(#2f4fdb_0deg,#2f4fdb_240deg,#55c7f2_240deg,#55c7f2_320deg,#edf3fa_320deg,#edf3fa_360deg)]">
                <div className="grid h-32 w-32 place-items-center rounded-full bg-white">
                  <div className="text-center">
                    <p className="text-4xl font-black text-[#1d2530]">{stockAccuracy}%</p>
                    <p className="mt-1 text-xs font-black text-[#1fba80]">+ 12%</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <aside className="grid h-fit gap-5">
        <section className="admin-card rounded-[28px] p-5">
          <h2 className="text-xl font-black text-[#1d2530]">Top Selling Product</h2>
          <div className="mt-7 flex items-center gap-3">
            <p className="text-4xl font-black text-[#1d2530]">{topSeller?.quantity || 0}</p>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf8ff] text-[#45bff0]">
              <PackageCheck size={17} />
            </span>
            <span className="rounded-full bg-[#ecfff9] px-2 py-1 text-xs font-black text-[#1fba80]">+ 5%</span>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf3fa]">
            <div className="h-full w-4/5 bg-[#45bff0]" />
          </div>
          <div className="mt-6 grid gap-3">
            {(data.bestSellers.slice(0, 3).length ? data.bestSellers.slice(0, 3) : [{ name: "Skincare" }, { name: "Makeup" }, { name: "Fragrance" }]).map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center gap-3 text-sm font-bold text-[#7d8ca2]">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${["bg-[#45bff0]", "bg-[#2f4fdb]", "bg-[#edf8ff]"][index]} ${index === 2 ? "text-[#45bff0]" : "text-white"}`}>
                  <Boxes size={18} />
                </span>
                {item.name}
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#1d2530]">Live Revenue</h2>
            <TrendingUp size={21} className="text-[#1fba80]" />
          </div>
          <p className="mt-8 text-center text-4xl font-black text-[#1d2530]">{money(data.sales)}</p>
          <p className="mt-2 text-center text-sm font-bold text-[#7d8ca2]"><span className="text-[#1fba80]">+ 5%</span> higher</p>
          <div className="mt-8 grid h-40 grid-cols-5 items-end gap-3 border-b border-dashed border-[#dfe9f5]">
            {[55, 26, 42, 34, 72].map((height, index) => (
              <span key={index} className="rounded-t-xl bg-[#45bff0]" style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

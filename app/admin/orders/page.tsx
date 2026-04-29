"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CircleDollarSign, LucideIcon, PackageCheck, Search } from "lucide-react";
import { money } from "@/lib/format";
import { OrderStatus } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

const statuses: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "COMPLETED", "CANCELLED"];

export default function AdminOrdersPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [orders, setOrders] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const completedOrders = orders.filter((order) => order.status === "COMPLETED").length;
  const visibleOrders = orders.filter((order) => `${order.customerName || ""} ${order.phone || ""} ${order.address || ""} ${order.status || ""}`.toLowerCase().includes(query.toLowerCase()));
  const summaryCards: Array<[string, string | number, LucideIcon]> = [
    ["Total orders", orders.length, PackageCheck],
    ["Completed", completedOrders, CalendarDays],
    ["Revenue", money(totalRevenue), CircleDollarSign]
  ];

  function load() {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/orders", { headers })
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []));
  }

  useEffect(load, [token]);

  async function updateStatus(id: string, status: OrderStatus) {
    const response = await fetch(`/api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return toast("Status update failed", "error");
    toast("Order status updated");
    load();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Operations</p>
          <h1 className="text-4xl font-black text-[#15130f]">Orders</h1>
        </div>
        <label className="flex h-12 w-full max-w-sm items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-500">
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search orders..." />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(([label, value, Icon]) => (
          <div key={String(label)} className="admin-card rounded-[22px] p-5">
            <Icon className="text-[#e0a900]" size={23} />
            <p className="mt-4 text-sm font-black text-neutral-400">{String(label)}</p>
            <p className="mt-1 text-3xl font-black text-[#15130f]">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {visibleOrders.map((order) => (
          <div key={order.id} className="admin-card rounded-[24px] p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ffdc1f] text-lg font-black text-[#15130f]">{order.customerName?.slice(0, 1) || "O"}</span>
                <div>
                  <p className="font-black text-[#15130f]">{order.customerName}</p>
                  <p className="mt-1 text-sm text-neutral-500">{order.phone} - {order.address}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xl font-black text-[#15130f]">{money(order.total)}</p>
                <p className="text-xs text-neutral-500">{order.items?.length || 0} items</p>
              </div>
            </div>
            <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value as OrderStatus)} className="mt-4 rounded-2xl border border-neutral-200 bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#15130f] outline-none">
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        ))}
        {!visibleOrders.length && <p className="text-sm text-neutral-500">No orders found.</p>}
      </div>
    </div>
  );
}

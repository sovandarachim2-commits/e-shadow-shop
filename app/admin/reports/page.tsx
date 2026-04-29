"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Boxes, LucideIcon, TrendingUp } from "lucide-react";
import { money } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export default function AdminReportsPage() {
  const token = useAuthStore((state) => state.token);
  const [report, setReport] = useState<any>({ chart: [], bestSellers: [], sales: 0 });
  const summaryCards: Array<[string, string | number, LucideIcon]> = [
    ["Completed sales", money(report.sales || 0), TrendingUp],
    ["Completed orders", report.completedOrders || 0, BarChart3],
    ["Best sellers", report.bestSellers?.length || 0, Boxes]
  ];

  useEffect(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/reports", { headers })
      .then((r) => r.json())
      .then((data) => setReport(data));
  }, [token]);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Insights</p>
        <h1 className="text-4xl font-black text-[#15130f]">Reports & Analytics</h1>
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

      <div className="admin-card rounded-[26px] p-5">
        <div className="flex justify-between">
          <h2 className="text-xl font-black text-[#15130f]">Sales Overview</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-600">{money(report.sales || 0)}</span>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.chart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e4d8" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#ffdc1f" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="admin-card rounded-[26px] p-5">
        <h2 className="text-xl font-black text-[#15130f]">Best Selling Products</h2>
        <div className="mt-4 grid gap-3">
          {(report.bestSellers || []).map((product: any) => (
            <div key={product.name} className="flex justify-between rounded-2xl bg-[#fbfaf7] p-4 text-sm">
              <span className="font-black text-[#15130f]">{product.name}</span>
              <span className="font-bold text-neutral-500">{product.quantity} sold - {money(product.revenue)}</span>
            </div>
          ))}
          {!report.bestSellers?.length && <p className="text-sm text-neutral-500">No completed sales yet.</p>}
        </div>
      </div>
    </div>
  );
}

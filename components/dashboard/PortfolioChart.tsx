"use client";
import React from "react";

import { GlassCard } from "@/components/ui/GlassCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const PortfolioChart = ({
  className,
  data,
}: {
  className?: string;
  data: { date: string; value: number }[];
}) => {
  return (
    <div
      className={`bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col ${className || "h-[400px]"}`}
    >
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#135bec" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#135bec" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
              strokeOpacity={0.1}
            />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#101622",
                border: "1px solid #1e293b",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "#fff" }}
              cursor={{
                stroke: "#135bec",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              formatter={(value: number | undefined) =>
                [`$${value ?? 0}`, "Value"] as [string, string]
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#135bec"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={{ r: 4, fill: "#135bec", strokeWidth: 0 }}
              activeDot={{
                r: 6,
                fill: "#135bec",
                strokeWidth: 2,
                stroke: "#fff",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-100 dark:border-slate-800 pt-4">
        {/* Custom Legend or Footer if needed */}
      </div>
    </div>
  );
};

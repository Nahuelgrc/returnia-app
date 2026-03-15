"use client";
import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";

const COLORS = [
  "#135bec", // Primary
  "#0bda5e", // Success
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
  "#404040", // Others
];

export const AllocationChart = ({ data = [] }: { data?: any[] }) => {
  const processedData = useMemo(() => {
    // 1. Sort by value descending
    const sorted = [...data].sort((a, b) => b.value - a.value);

    // 2. Take top 7
    const top7 = sorted.slice(0, 7);

    // 3. Sum the rest
    const othersValue = sorted
      .slice(7)
      .reduce((sum, item) => sum + item.value, 0);

    // 4. Combine
    const finalData = [...top7];
    if (othersValue > 0) {
      finalData.push({ name: "Others", value: othersValue });
    }

    return finalData;
  }, [data]);

  const totalValue = useMemo(
    () => processedData.reduce((sum, item) => sum + item.value, 0),
    [processedData],
  );

  return (
    <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex-1 flex flex-col h-full">
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, bottom: 20 }}>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {processedData.map((entry, index) => {
                const colorIndex =
                  entry.name === "Others"
                    ? COLORS.length - 1
                    : index % (COLORS.length - 1);
                return <Cell key={`cell-${index}`} fill={COLORS[colorIndex]} />;
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#101622",
                border: "1px solid #1e293b",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: number | undefined) =>
                value != null
                  ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "$0.00"
              }
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
          <p className="text-xs font-bold text-slate-500 uppercase"></p>
          <p className="text-xl font-extrabold text-foreground">Assets</p>
        </div>
      </div>
      {/* Custom Legend List (Scrollable) */}
      <div className="flex flex-col gap-2 mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
        {processedData.map((entry, index) => {
          const colorIndex =
            entry.name === "Others"
              ? COLORS.length - 1
              : index % (COLORS.length - 1);
          const pct = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : "0.0";
          return (
            <div
              key={entry.name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[colorIndex] }}
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-400 group-hover:text-foreground">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

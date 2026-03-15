import React from 'react';
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: string;
  trend?: number; // percentage
  trendLabel?: string;
  icon?: React.ReactNode;
}

export const StatCard = ({ label, value, trend, trendLabel, icon }: StatCardProps) => {
  const isPositive = trend && trend >= 0;

  return (
    <GlassCard className="flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-neutral-400">{label}</span>
        {icon && <div className="text-neutral-500">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>

      {trend !== undefined && (
        <div className={clsx("flex items-center text-xs font-medium", isPositive ? "text-emerald-400" : "text-red-400")}>
          {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-neutral-500 ml-1">{trendLabel}</span>}
        </div>
      )}
    </GlassCard>
  );
}

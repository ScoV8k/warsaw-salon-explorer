"use client";

import { Stats } from "@/lib/types";

interface StatsBarProps {
  stats: Stats | null;
}

export default function StatsBar({ stats }: StatsBarProps) {
  if (!stats) return null;

  const items = [
    { label: "Salons", value: stats.total_salons.toLocaleString() },
    { label: "Districts", value: stats.total_districts.toLocaleString() },
    { label: "Avg Rating", value: stats.avg_rating?.toFixed(1) ?? "–" },
    { label: "Reviews", value: stats.total_reviews.toLocaleString() },
  ];

  return (
    <div id="stats-bar" className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-surface border border-border/60 rounded-xl px-4 py-3
                     transition-all duration-200 hover:border-border hover:shadow-sm
                     group cursor-default"
        >
          <span className="text-2xl font-bold text-foreground block tracking-tight
                          group-hover:text-accent transition-colors duration-200">
            {item.value}
          </span>
          <span className="text-[11px] text-muted uppercase tracking-widest">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

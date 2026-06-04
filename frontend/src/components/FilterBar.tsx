"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { District } from "@/lib/types";

interface FilterBarProps {
  districts: District[];
  selectedDistrict: string;
  onDistrictChange: (d: string) => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  totalResults: number;
}

export default function FilterBar({
  districts,
  selectedDistrict,
  onDistrictChange,
  sortBy,
  onSortChange,
  totalResults,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchValue(val);
    
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set("q", val);
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
  }

  return (
    <div id="filter-bar" className="bg-surface border border-border/60 rounded-xl p-3 mb-6
                sticky top-[73px] z-20 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            id="filter-search-input"
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search salons..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-hover border-0 text-sm
                       text-foreground placeholder:text-muted/60 transition-all
                       focus:ring-2 focus:ring-accent/20 focus:bg-surface"
          />
        </div>
        <select
          id="district-filter"
          value={selectedDistrict}
          onChange={(e) => onDistrictChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-hover border-0 text-sm text-foreground
                     transition-all cursor-pointer
                     focus:ring-2 focus:ring-accent/20 focus:bg-surface"
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d.district} value={d.district}>
              {d.district} ({d.count})
            </option>
          ))}
        </select>

        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-hover border-0 text-sm text-foreground
                     transition-all cursor-pointer
                     focus:ring-2 focus:ring-accent/20 focus:bg-surface"
        >
          <option value="name:asc">Name A→Z</option>
          <option value="name:desc">Name Z→A</option>
          <option value="rating:desc">Highest rated</option>
          <option value="rating:asc">Lowest rated</option>
          <option value="reviews_count:desc">Most reviewed</option>
        </select>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted px-0.5">
        <span>{totalResults.toLocaleString()} salons found</span>
        {selectedDistrict && (
          <button
            id="clear-filters"
            onClick={() => onDistrictChange("")}
            className="text-accent hover:text-accent-hover transition-colors font-medium cursor-pointer"
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Salon, District, Stats } from "@/lib/types";
import { fetchSalons, fetchDistricts, fetchStats, SalonListParams } from "@/lib/api";
import SalonCard from "@/components/SalonCard";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import StatsBar from "@/components/StatsBar";
import SalonDetail from "@/components/SalonDetail";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function HomeContent() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [district, setDistrict] = useState("");
  const [sortBy, setSortBy] = useState("name:asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const search = searchParams.get("q") || "";

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchDistricts().then(setDistricts).catch(() => {});
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const loadSalons = useCallback(() => {
    setLoading(true);
    const [sort, order] = sortBy.split(":");
    const params: SalonListParams = {
      page,
      per_page: 18,
      sort_by: sort,
      sort_order: order,
    };
    if (district) params.district = district;
    if (search) params.search = search;

    fetchSalons(params)
      .then((res) => {
        setSalons(res.data);
        setTotalPages(res.total_pages);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, district, search, sortBy]);

  useEffect(() => {
    loadSalons();
  }, [loadSalons]);

  function handleDistrictChange(d: string) {
    setDistrict(d);
    setPage(1);
  }

  function handleSortChange(s: string) {
    setSortBy(s);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FilterBar
          districts={districts}
          selectedDistrict={district}
          onDistrictChange={handleDistrictChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          totalResults={total}
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-surface rounded-xl border border-border/60 overflow-hidden">
                <div className="h-40 skeleton" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                  <div className="h-3 skeleton rounded w-2/3" />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 skeleton rounded w-16" />
                    <div className="h-5 skeleton rounded w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-0.5">No salons found</h3>
            <p className="text-xs text-muted">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {salons.map((salon) => (
              <SalonCard
                key={salon.google_place_id}
                salon={salon}
                onClick={() => setSelectedId(salon.google_place_id)}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      {selectedId && (
        <SalonDetail
          placeId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={loadSalons}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-8">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

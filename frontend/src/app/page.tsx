"use client";

import { useState, useEffect, useMemo } from "react";
import { District, PaginatedResponse } from "@/lib/types";
import { fetchSalons, fetchDistricts, SalonListParams } from "@/lib/api";
import SalonCard from "@/components/SalonCard";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import SalonDetail from "@/components/SalonDetail";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PER_PAGE = 18;
const EMPTY_PAGE: PaginatedResponse = { data: [], total: 0, page: 1, per_page: PER_PAGE, total_pages: 1 };

function HomeContent() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState("");
  const [sortBy, setSortBy] = useState("name:asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Last response, tagged with the query it answers; loading = it answers an older query.
  const [result, setResult] = useState<{ key: string; data: PaginatedResponse } | null>(null);

  const searchParams = useSearchParams();
  const search = searchParams.get("q") || "";

  // A new search starts from page 1 (adjusting state during render, not in an effect).
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setPage(1);
  }

  useEffect(() => {
    fetchDistricts().then(setDistricts).catch(() => {});
  }, []);

  const params = useMemo<SalonListParams>(() => {
    const [sort, order] = sortBy.split(":");
    return {
      page,
      per_page: PER_PAGE,
      sort_by: sort,
      sort_order: order,
      district: district || undefined,
      search: search || undefined,
    };
  }, [page, district, search, sortBy]);
  const queryKey = `${JSON.stringify(params)}#${reloadToken}`;

  useEffect(() => {
    let cancelled = false; // ignore responses for a page the user already left
    fetchSalons(params)
      .then((data) => !cancelled && setResult({ key: queryKey, data }))
      .catch(() => !cancelled && setResult({ key: queryKey, data: EMPTY_PAGE }));
    return () => {
      cancelled = true;
    };
  }, [params, queryKey]);

  const loading = result?.key !== queryKey;
  const { data: salons, total, total_pages: totalPages } = result?.data ?? EMPTY_PAGE;

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
            {salons.map((salon, i) => (
              <SalonCard
                key={salon.google_place_id}
                salon={salon}
                priority={i < 3}
                fetchCover
                onClick={() => setSelectedId(salon.google_place_id)}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      {selectedId && (
        <SalonDetail
          key={selectedId}
          placeId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => setReloadToken((t) => t + 1)}
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

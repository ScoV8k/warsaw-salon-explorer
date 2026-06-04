"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <header className="border-b border-border/60 bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-accent overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-foreground tracking-tight leading-none group-hover:text-accent transition-colors">Beauty Salons</h1>
            <p className="text-xs text-muted mt-0.5">Warsaw directory</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 bg-surface-hover p-1.5 rounded-xl border border-border/40 shadow-inner">
          <Link
            href={`/?${searchParams.toString()}`}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              pathname === "/" 
                ? "bg-surface shadow text-foreground" 
                : "text-muted hover:text-foreground"
            }`}
          >
            List
          </Link>
          <Link
            href={`/map?${searchParams.toString()}`}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              pathname === "/map" 
                ? "bg-surface shadow text-foreground" 
                : "text-muted hover:text-foreground"
            }`}
          >
            Map
          </Link>
        </nav>
      </div>
    </header>
  );
}

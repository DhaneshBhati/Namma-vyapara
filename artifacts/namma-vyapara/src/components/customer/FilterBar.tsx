import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUpDown,
  IndianRupee,
  Sprout,
  Star,
  SlidersHorizontal,
  X,
  MapPin,
} from "lucide-react";

export type SortKey = "distance" | "rating" | "hype";
export type FreshnessFilter = "any" | "today" | "1day";

export interface CustomerFilters {
  productQuery: string;
  maxPrice: number | null;
  minRating: number;
  freshness: FreshnessFilter;
  maxDistanceKm: number | null;
  sortBy: SortKey;
}

export const DEFAULT_FILTERS: CustomerFilters = {
  productQuery: "",
  maxPrice: null,
  minRating: 0,
  freshness: "any",
  maxDistanceKm: null,
  sortBy: "distance",
};

interface Props {
  filters: CustomerFilters;
  onChange: (next: CustomerFilters) => void;
  resultCount: number;
}

export function FilterBar({ filters, onChange, resultCount }: Props) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof CustomerFilters>(
    key: K,
    value: CustomerFilters[K],
  ) => onChange({ ...filters, [key]: value });

  const activeCount =
    (filters.productQuery ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.freshness !== "any" ? 1 : 0) +
    (filters.maxDistanceKm !== null ? 1 : 0);

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Input
            value={filters.productQuery}
            onChange={(e) => set("productQuery", e.target.value)}
            placeholder="Search vendor or item (e.g. mango, dosa)…"
            className="pr-8"
            data-testid="input-filter-search"
          />
          {filters.productQuery && (
            <button
              type="button"
              onClick={() => set("productQuery", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-2"
              data-testid="button-open-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <Badge className="bg-primary text-primary-foreground h-5 min-w-5 px-1.5 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4" align="end">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" /> Max price (any item)
                </label>
                {filters.maxPrice !== null && (
                  <button
                    type="button"
                    onClick={() => set("maxPrice", null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="No limit"
                value={filters.maxPrice ?? ""}
                onChange={(e) => {
                  const n = e.target.value === "" ? null : Number(e.target.value);
                  set("maxPrice", Number.isFinite(n!) && (n as number) >= 0 ? n : null);
                }}
                data-testid="input-filter-max-price"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Sprout className="h-3.5 w-3.5" /> Freshness
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { v: "any", l: "Any" },
                    { v: "1day", l: "≤ 1 day" },
                    { v: "today", l: "Today" },
                  ] as { v: FreshnessFilter; l: string }[]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => set("freshness", opt.v)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      filters.freshness === opt.v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                    data-testid={`chip-fresh-${opt.v}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Star className="h-3.5 w-3.5" /> Min rating
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {[0, 3, 3.5, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set("minRating", r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      filters.minRating === r
                        ? "border-secondary bg-secondary text-secondary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                    data-testid={`chip-rating-${r}`}
                  >
                    {r === 0 ? "Any" : `${r}★+`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Max distance (km)
                </label>
                {filters.maxDistanceKm !== null && (
                  <button
                    type="button"
                    onClick={() => set("maxDistanceKm", null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1, 2, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      set(
                        "maxDistanceKm",
                        filters.maxDistanceKm === d ? null : d,
                      )
                    }
                    className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      filters.maxDistanceKm === d
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                    data-testid={`chip-distance-${d}`}
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                data-testid="button-reset-filters"
              >
                Reset all
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-2"
              data-testid="button-sort"
            >
              <ArrowUpDown className="h-4 w-4" />
              {filters.sortBy === "distance"
                ? "Nearest"
                : filters.sortBy === "rating"
                  ? "Top-rated"
                  : "Trending"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            {(
              [
                { v: "distance", l: "Nearest first" },
                { v: "rating", l: "Top-rated first" },
                { v: "hype", l: "Trending first" },
              ] as { v: SortKey; l: string }[]
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => set("sortBy", opt.v)}
                className={`block w-full text-left px-2.5 py-1.5 text-sm rounded-md hover:bg-muted ${
                  filters.sortBy === opt.v ? "font-semibold text-primary" : ""
                }`}
                data-testid={`sort-${opt.v}`}
              >
                {opt.l}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <span>
          Showing <span className="font-semibold text-foreground">{resultCount}</span>{" "}
          {resultCount === 1 ? "vendor" : "vendors"}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/** Filter + sort utility used by the customer dashboard. */
export function applyFilters<
  V extends {
    name: string;
    distanceKm: number;
    hype: number;
    items: { name: string; price: number; freshDays?: number }[];
    rating: { qualityAvg: number };
    stockedDaysAgo?: number;
  },
>(list: V[], f: CustomerFilters): V[] {
  const q = f.productQuery.trim().toLowerCase();
  const filtered = list.filter((v) => {
    if (q) {
      const hit =
        v.name.toLowerCase().includes(q) ||
        v.items.some((it) => it.name.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (f.maxPrice !== null) {
      const cheapest = v.items.reduce(
        (m, it) => Math.min(m, it.price),
        Infinity,
      );
      if (cheapest > f.maxPrice) return false;
    }
    if (f.minRating > 0 && v.rating.qualityAvg < f.minRating) return false;
    if (f.freshness !== "any") {
      const cutoff = f.freshness === "today" ? 0 : 1;
      const days = v.stockedDaysAgo;
      if (days === undefined || days > cutoff) return false;
    }
    if (f.maxDistanceKm !== null && v.distanceKm > f.maxDistanceKm)
      return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (f.sortBy === "rating") return b.rating.qualityAvg - a.rating.qualityAvg;
    if (f.sortBy === "hype") return b.hype - a.hype;
    return a.distanceKm - b.distanceKm;
  });
}

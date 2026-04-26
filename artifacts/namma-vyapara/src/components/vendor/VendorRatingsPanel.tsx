import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, ThumbsDown, ShieldCheck, MessageCircle } from "lucide-react";
import {
  getRatingsForVendor,
  subscribeRatings,
  verifiedRatingFor,
  type VendorRatingRecord,
} from "@/lib/ratings";

interface Props {
  vendorId: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= Math.round(value)
              ? "fill-secondary text-secondary"
              : "text-muted-foreground/35"
          }`}
        />
      ))}
    </div>
  );
}

export function VendorRatingsPanel({ vendorId }: Props) {
  const [ratings, setRatings] = useState<VendorRatingRecord[]>([]);
  const [agg, setAgg] = useState<{
    qualityAvg: number;
    freshnessAvg: number;
    count: number;
  } | null>(null);

  const refresh = () => {
    setRatings(getRatingsForVendor(vendorId));
    setAgg(verifiedRatingFor(vendorId));
  };

  useEffect(() => {
    refresh();
    const unsub = subscribeRatings(refresh);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-secondary font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Customer Ratings
          </div>
          <h2 className="font-serif text-xl mt-0.5">Verified-purchase reviews</h2>
        </div>
      </div>

      {agg ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Quality
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-serif text-3xl">
                {agg.qualityAvg.toFixed(1)}
              </span>
              <StarRow value={agg.qualityAvg} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              from {agg.count} verified rating{agg.count === 1 ? "" : "s"}
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Freshness
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-serif text-3xl">
                {agg.freshnessAvg.toFixed(1)}
              </span>
              <StarRow value={agg.freshnessAvg} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {agg.freshnessAvg >= 4 ? "Buyers love your fresh stock" : "Room to improve"}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <MessageCircle className="h-7 w-7 text-muted-foreground mx-auto" />
          <div className="mt-2 font-medium">No verified ratings yet</div>
          <div className="text-xs text-muted-foreground mt-1">
            Once a buyer uses one of your codes to rate, it'll show up here.
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {ratings.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border p-3"
              data-testid={`rating-row-${r.id}`}
            >
              <div className="flex items-center gap-2">
                <StarRow value={r.quality} />
                {r.freshness >= 4 ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 gap-1 text-[10px]">
                    <ThumbsUp className="h-3 w-3" /> Fresh
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 gap-1 text-[10px]">
                    <ThumbsDown className="h-3 w-3" /> Not fresh
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {timeAgo(r.timestamp)}
                </span>
              </div>
              {r.comment && (
                <p className="text-xs text-muted-foreground mt-1.5 italic">
                  "{r.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

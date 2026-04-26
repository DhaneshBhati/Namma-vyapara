import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  Radio,
} from "lucide-react";
import { haversineKm } from "@/lib/vendors";
import {
  getLiveLocations,
  subscribeLive,
  type LiveLocation,
} from "@/lib/liveLocation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string | null;
  customerCenter: { lat: number; lng: number };
}

interface Sample {
  t: number;
  distanceKm: number;
}

const WALK_KMPH = 5;

export function LiveTrackModal({ open, onOpenChange, phone, customerCenter }: Props) {
  const [tick, setTick] = useState(0);
  const samples = useRef<Sample[]>([]);
  const lastPhone = useRef<string | null>(null);

  // Re-render on live updates so distance/ETA stay current.
  useEffect(() => {
    if (!open) return;
    const unsub = subscribeLive(() => setTick((t) => t + 1));
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [open]);

  // Reset samples when target vendor changes.
  useEffect(() => {
    if (phone !== lastPhone.current) {
      samples.current = [];
      lastPhone.current = phone;
    }
  }, [phone]);

  const live: LiveLocation | null = useMemo(() => {
    if (!phone) return null;
    return getLiveLocations().find((l) => l.phone === phone) ?? null;
    // tick re-runs the memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, tick]);

  const distanceKm = live
    ? haversineKm(customerCenter.lat, customerCenter.lng, live.lat, live.lng)
    : null;

  // Track rolling samples to estimate trend.
  useEffect(() => {
    if (distanceKm === null) return;
    const arr = samples.current;
    arr.push({ t: Date.now(), distanceKm });
    while (arr.length > 12) arr.shift();
  }, [distanceKm]);

  const trend = useMemo(() => {
    const arr = samples.current;
    if (arr.length < 3) return "steady" as const;
    const first = arr[0]!.distanceKm;
    const last = arr[arr.length - 1]!.distanceKm;
    const delta = last - first;
    if (delta < -0.02) return "closer" as const;
    if (delta > 0.02) return "farther" as const;
    return "steady" as const;
  }, [tick]);

  const etaMin =
    distanceKm !== null ? Math.max(1, Math.round((distanceKm / WALK_KMPH) * 60)) : null;
  const lastUpdate = live ? Math.max(0, Math.floor((Date.now() - live.updatedAt) / 1000)) : null;
  const liveSinceMin = live
    ? Math.max(1, Math.floor((Date.now() - live.startedAt) / 60_000))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-live-track">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Live tracking
          </DialogTitle>
          <DialogDescription>
            {live
              ? `${live.vendorName} is broadcasting their cart location right now.`
              : "Vendor is no longer live."}
          </DialogDescription>
        </DialogHeader>

        {!live && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            This vendor stopped broadcasting. They may be on a break or have
            packed up for the day.
          </div>
        )}

        {live && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-4">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <Badge className="bg-primary text-primary-foreground">LIVE</Badge>
                {live.subcategory && (
                  <Badge variant="outline" className="border-secondary text-secondary">
                    {live.subcategory}
                  </Badge>
                )}
                {live.demo && (
                  <Badge variant="outline" className="text-[10px]">
                    Demo cart
                  </Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                    Distance
                  </div>
                  <div className="text-2xl font-serif text-primary mt-0.5">
                    {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                    Walk ETA
                  </div>
                  <div className="text-2xl font-serif mt-0.5">
                    {etaMin !== null ? `${etaMin} min` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-widest">
                    Trend
                  </div>
                  <div className="text-sm mt-2 inline-flex items-center gap-1">
                    {trend === "closer" && (
                      <>
                        <TrendingDown className="h-4 w-4 text-accent" />
                        <span className="text-accent font-medium">Closer</span>
                      </>
                    )}
                    {trend === "farther" && (
                      <>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-600 font-medium">Farther</span>
                      </>
                    )}
                    {trend === "steady" && (
                      <>
                        <Minus className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">Steady</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Coordinates</div>
                  <div className="font-mono text-xs truncate">
                    {live.lat.toFixed(4)}, {live.lng.toFixed(4)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-secondary mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">Last update</div>
                  <div className="font-medium">
                    {lastUpdate !== null ? `${lastUpdate}s ago` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {liveSinceMin !== null && (
              <div className="text-xs text-muted-foreground text-center">
                Cart has been live for ~{liveSinceMin} min
              </div>
            )}

            <div className="flex items-center gap-2">
              {!live.demo && (
                <Button asChild variant="outline" className="flex-1">
                  <a href={`tel:${live.phone}`}>
                    <Phone className="h-4 w-4 mr-1.5" /> Call vendor
                  </a>
                </Button>
              )}
              <Button asChild className="flex-1">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${live.lat},${live.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="h-4 w-4 mr-1.5" /> Walk to cart
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

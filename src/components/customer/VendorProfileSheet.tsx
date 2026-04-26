import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Apple,
  Carrot,
  Cookie,
  CupSoda,
  Candy,
  Utensils,
  ShoppingBasket,
  Flower2,
  Leaf,
  Coffee,
  Soup,
  ShoppingCart,
  Store,
  Star,
  Sprout,
  Phone,
  Navigation,
  BellRing,
  Heart,
  ShieldCheck,
  Clock,
  Radio,
  MapPin,
  Zap,
} from "lucide-react";
import {
  freshnessLabel,
  walkingEtaMinutes,
  type Vendor,
} from "@/lib/vendors";
import { verifiedRatingFor } from "@/lib/ratings";
import {
  getFlashSaleFor,
  subscribeFlashSales,
  formatRemaining,
  type FlashSale,
} from "@/lib/flashSale";
import { toast } from "sonner";

type VendorSheetVendor = Vendor & {
  isLive?: boolean;
  livePhone?: string;
  liveUpdatedAt?: number;
  flashSale?: FlashSale;
};

interface Props {
  vendor: VendorSheetVendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: boolean;
  isWatched: boolean;
  isGuest: boolean;
  onSignIn: () => void;
  onFavorite: (v: Vendor) => void;
  onOrder: (v: Vendor) => void;
  onTrackLive: (livePhone: string) => void;
  onNotifyMe: (v: Vendor) => void;
  onRate: (v: Vendor) => void;
  /** Bumped when ratings change so the sheet re-reads. */
  ratingsVersion?: number;
}

function CategoryIcon({
  category,
  subcategory,
}: {
  category: Vendor["category"];
  subcategory?: Vendor["subcategory"];
}) {
  const cls = "h-5 w-5 text-white";
  if (category === "Pushcart") {
    switch (subcategory) {
      case "Fruits":
        return <Apple className={cls} />;
      case "Vegetables":
        return <Carrot className={cls} />;
      case "Snacks":
        return <Cookie className={cls} />;
      case "Juice":
        return <CupSoda className={cls} />;
      case "Sweets":
        return <Candy className={cls} />;
      default:
        return <ShoppingCart className={cls} />;
    }
  }
  switch (category) {
    case "Restaurant":
      return <Utensils className={cls} />;
    case "Grocery":
      return <ShoppingBasket className={cls} />;
    case "Flowers":
      return <Flower2 className={cls} />;
    case "Tender Coconut":
      return <Leaf className={cls} />;
    case "Tea Stall":
      return <Coffee className={cls} />;
    case "Tiffin":
      return <Soup className={cls} />;
    default:
      return <Store className={cls} />;
  }
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

export function VendorProfileSheet({
  vendor,
  open,
  onOpenChange,
  isFavorite,
  isWatched,
  isGuest,
  onSignIn,
  onFavorite,
  onOrder,
  onTrackLive,
  onNotifyMe,
  onRate,
  ratingsVersion,
}: Props) {
  // Use a snapshot of the vendor while the sheet animates closed so content
  // doesn't flash empty.
  const [shown, setShown] = useState<VendorSheetVendor | null>(vendor);
  useEffect(() => {
    if (vendor) setShown(vendor);
  }, [vendor]);

  const verified = useMemo(() => {
    if (!shown) return null;
    return verifiedRatingFor(shown.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown?.id, ratingsVersion]);

  // Subscribe to flash sales so the sheet always shows the freshest state
  // even if it was opened before the sale started or just after.
  const [liveFlash, setLiveFlash] = useState<FlashSale | null>(null);
  const [flashNow, setFlashNow] = useState(Date.now());
  useEffect(() => {
    if (!open || !shown?.phone) {
      setLiveFlash(null);
      return;
    }
    const refresh = () => setLiveFlash(getFlashSaleFor(shown.phone!));
    refresh();
    const unsub = subscribeFlashSales(refresh);
    const id = window.setInterval(() => {
      setFlashNow(Date.now());
      refresh();
    }, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [open, shown?.phone]);

  if (!shown) return null;

  const flashSale = liveFlash ?? shown.flashSale ?? null;

  const fresh = freshnessLabel(shown.stockedDaysAgo);
  const isPushcart = shown.category === "Pushcart";
  const freshnessApplicable =
    isPushcart &&
    (shown.subcategory === "Fruits" || shown.subcategory === "Vegetables");

  // Prefer verified rating if any exists.
  const qualityAvg = verified?.qualityAvg ?? shown.rating.qualityAvg;
  const freshnessAvg = verified?.freshnessAvg ?? shown.rating.freshnessAvg;
  const ratingCount = (verified?.count ?? 0) + shown.rating.count;

  // ETA is only meaningful for pushcarts (mobile vendors). Stationary
  // shops/restaurants don't move toward you, so showing a "walk time"
  // estimate for them is misleading.
  const eta = isPushcart
    ? (shown.etaMinutes ?? walkingEtaMinutes(shown.distanceKm))
    : null;

  const cheapest = [...shown.items].sort((a, b) => a.price - b.price)[0];

  const handleNotify = () => {
    if (isGuest) {
      onSignIn();
      return;
    }
    onNotifyMe(shown);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-y-auto"
      >
        {/* HEADER */}
        <div
          className={`relative px-5 pt-6 pb-5 ${
            shown.isLive
              ? "bg-gradient-to-br from-primary/25 via-primary/10 to-transparent"
              : isPushcart
                ? "bg-gradient-to-br from-secondary/20 via-secondary/5 to-transparent"
                : "bg-gradient-to-br from-accent/15 via-accent/5 to-transparent"
          }`}
        >
          <SheetHeader className="space-y-2 text-left">
            <div className="flex items-start gap-3">
              <div
                className={`h-12 w-12 rounded-xl grid place-items-center shadow-sm shrink-0 ${
                  shown.isLive
                    ? "bg-primary"
                    : isPushcart
                      ? "bg-secondary"
                      : "bg-accent"
                }`}
                aria-hidden
              >
                <CategoryIcon
                  category={shown.category}
                  subcategory={shown.subcategory}
                />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle
                  className="font-serif text-2xl leading-tight truncate"
                  data-testid="text-vendor-profile-name"
                >
                  {shown.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-1.5 text-xs flex-wrap mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {shown.category}
                    {shown.subcategory ? ` · ${shown.subcategory}` : ""}
                  </Badge>
                  {shown.isLive && (
                    <Badge className="bg-primary text-primary-foreground gap-1 text-[10px]">
                      <span className="live-dot" /> LIVE
                    </Badge>
                  )}
                  {!shown.isLive &&
                    (shown.openNow ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500 text-emerald-600 text-[10px]"
                      >
                        Open now
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Closed
                      </Badge>
                    ))}
                </SheetDescription>
              </div>
            </div>

            {/* Rating + distance + ETA strip */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-lg bg-background/70 backdrop-blur p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Rating
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-secondary text-secondary" />
                  <span
                    className="font-semibold text-base"
                    data-testid="text-vendor-rating"
                  >
                    {qualityAvg.toFixed(1)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {ratingCount} ratings
                </div>
              </div>

              <div className="rounded-lg bg-background/70 backdrop-blur p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Distance
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-base">
                    {shown.distanceKm.toFixed(2)} km
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  away from you
                </div>
              </div>

              {eta !== null ? (
                <div
                  className={`rounded-lg p-3 ${
                    shown.isLive
                      ? "bg-primary/15"
                      : "bg-background/70 backdrop-blur"
                  }`}
                  data-testid="block-vendor-eta"
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {shown.isLive ? "Arriving in" : "Walk time"}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-base">~{eta} min</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {shown.isLive ? "moving toward you" : "at walking pace"}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-background/70 backdrop-blur p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Hype
                  </div>
                  <div className="mt-1 font-semibold text-base">{shown.hype}</div>
                  <div className="text-[10px] text-muted-foreground">
                    in your area
                  </div>
                </div>
              )}
            </div>

            {/* Freshness banner — fruits/veg only */}
            {freshnessApplicable && fresh && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                  fresh.tone === "fresh"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : fresh.tone === "ok"
                      ? "bg-secondary/15 text-secondary"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
                data-testid="banner-vendor-freshness"
              >
                <Sprout className="h-3.5 w-3.5" />
                Fresh-rate: {fresh.label}
                <span className="ml-auto flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Freshness {freshnessAvg.toFixed(1)}/5
                </span>
              </div>
            )}

            {/* Tagline */}
            <p className="text-sm text-muted-foreground italic">
              "{shown.tagline}"
            </p>
          </SheetHeader>
        </div>

        {/* FLASH SALE BANNER — when this vendor has an active flash sale */}
        {flashSale && (
          <div
            className="mx-5 mt-4 rounded-xl border-2 border-secondary/50 bg-gradient-to-r from-secondary/15 via-primary/10 to-transparent p-3 flex items-start gap-3"
            data-testid="bar-flash-sale"
          >
            <div className="h-9 w-9 rounded-lg bg-secondary text-secondary-foreground grid place-items-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-secondary font-semibold">
                Flash sale live
              </div>
              <div className="text-sm font-semibold">
                {flashSale.discount}% off ·{" "}
                <span className="font-mono text-primary">
                  {formatRemaining(flashSale.endsAt, flashNow)}
                </span>{" "}
                left
              </div>
              {flashSale.message && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  "{flashSale.message}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* PUSHCART NOTIFICATION BAR — only for pushcarts */}
        {isPushcart && (
          <div
            className="mx-5 mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-3"
            data-testid="bar-pushcart-notify"
          >
            <BellRing className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">
                {isWatched
                  ? "You're watching this cart"
                  : "Get notified when this cart is near"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {isWatched
                  ? "We'll alert you when it crosses your range."
                  : "Set a range and we'll ping you on arrival."}
              </div>
            </div>
            <Button
              size="sm"
              variant={isWatched ? "outline" : "default"}
              onClick={handleNotify}
              data-testid="button-vendor-notify"
            >
              {isWatched ? "Edit" : "Notify me"}
            </Button>
          </div>
        )}

        {/* ITEMS / MENU */}
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Today's items
            </div>
            {cheapest && cheapest.price > 0 && (
              <div className="text-xs text-muted-foreground">
                from <span className="text-foreground font-semibold">₹{cheapest.price}</span>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border divide-y divide-border">
            {shown.items.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No items listed yet.
              </div>
            )}
            {shown.items.map((it) => {
              const itemFresh = freshnessLabel(it.freshDays);
              return (
                <div
                  key={it.name}
                  className="flex items-center justify-between p-3 gap-3"
                  data-testid={`item-row-${it.name}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs text-muted-foreground">
                      per {it.unit}
                      {itemFresh && (
                        <span
                          className={`ml-2 ${
                            itemFresh.tone === "fresh"
                              ? "text-emerald-600"
                              : itemFresh.tone === "ok"
                                ? "text-secondary"
                                : "text-amber-600"
                          }`}
                        >
                          · {itemFresh.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-semibold text-sm whitespace-nowrap">
                    {it.price > 0 ? `₹${it.price}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed rating breakdown */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Quality
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-serif text-2xl">
                  {qualityAvg.toFixed(1)}
                </span>
                <StarRow value={qualityAvg} />
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Freshness
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-serif text-2xl">
                  {freshnessAvg.toFixed(1)}
                </span>
                <StarRow value={freshnessAvg} />
              </div>
            </div>
          </div>

          {verified && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <ShieldCheck className="h-3 w-3" />
              Includes {verified.count} verified-purchase rating
              {verified.count === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="px-5 mt-6 mb-8 grid grid-cols-2 gap-2">
          {shown.isLive ? (
            <Button
              className="col-span-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onTrackLive(shown.livePhone!)}
              data-testid="button-sheet-track-live"
            >
              <Radio className="h-4 w-4 mr-1.5" /> Track live on map
            </Button>
          ) : isPushcart ? (
            <Button
              onClick={() => onOrder(shown)}
              data-testid="button-sheet-order"
              title="Pushcarts don't take pre-orders — raise a request and they'll set it aside for you."
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Raise Request
            </Button>
          ) : (
            <Button
              onClick={() => onOrder(shown)}
              data-testid="button-sheet-order"
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Order
            </Button>
          )}
          {!shown.isLive && (
            <a href={`tel:${shown.phone}`} className="block">
              <Button variant="outline" className="w-full">
                <Phone className="h-4 w-4 mr-1.5" /> Call
              </Button>
            </a>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${shown.lat},${shown.lng}`}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full">
              <Navigation className="h-4 w-4 mr-1.5" /> Directions
            </Button>
          </a>
          <Button
            variant="outline"
            onClick={() => onFavorite(shown)}
            data-testid="button-sheet-fav"
          >
            <Heart
              className={`h-4 w-4 mr-1.5 ${isFavorite ? "fill-secondary text-secondary" : ""}`}
            />
            {isFavorite ? "Saved" : "Save"}
          </Button>
          <Button
            variant="outline"
            className="col-span-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
            onClick={() => {
              if (isGuest) {
                toast.message("Sign in to rate vendors", {
                  action: { label: "Sign in", onClick: onSignIn },
                });
                return;
              }
              onRate(shown);
            }}
            data-testid="button-sheet-rate"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            I bought here — Rate now
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

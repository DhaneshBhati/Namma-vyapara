import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Locate,
  MapPin,
  Phone,
  Navigation,
  Sparkles,
  Lock,
  Flame,
  Heart,
  BellRing,
  ChevronLeft,
  Sprout,
  Radio,
  Star,
  Clock,
  Zap,
} from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import {
  BENGALURU_CENTER,
  generateNearbyVendors,
  freshnessLabel,
  haversineKm,
  walkingEtaMinutes,
  PUSHCART_SUBCATEGORIES,
  type Vendor,
  type VendorCategory,
  type VendorItem,
  type PushcartSubcategory,
} from "@/lib/vendors";
import { VendorMap } from "@/components/map/VendorMap";
import { NotifyMeDialog } from "@/components/NotifyMeDialog";
import { LiveTrackModal } from "@/components/customer/LiveTrackModal";
import { VendorProfileSheet } from "@/components/customer/VendorProfileSheet";
import { VendorNotifyDialog } from "@/components/customer/VendorNotifyDialog";
import { RateVendorModal } from "@/components/customer/RateVendorModal";
import {
  FilterBar,
  applyFilters,
  DEFAULT_FILTERS,
  type CustomerFilters,
} from "@/components/customer/FilterBar";
import { seedDemoCode } from "@/lib/ratings";
import {
  pushRecentVendor,
  toggleFavorite,
  getFavorites,
  getNotifySettings,
  getVendorWatches,
  addOrder,
  addVendorOrder,
  getVendors,
  getFreshnessItems,
  type FreshnessItem,
  type VendorRecord,
} from "@/lib/session";
import {
  getLiveLocations,
  startDemoLiveSimulator,
  stopDemoLiveSimulator,
  subscribeLive,
  isDemoPhone,
  type LiveLocation,
} from "@/lib/liveLocation";
import { subscribeCloud } from "@/lib/cloudKv";
import {
  getFlashSales,
  subscribeFlashSales,
  formatRemaining,
  type FlashSale,
} from "@/lib/flashSale";
import { toast } from "sonner";

interface Props {
  onSignIn: () => void;
}

const ALL_CATEGORIES: (VendorCategory | "All")[] = [
  "All",
  "Pushcart",
  "Restaurant",
  "Grocery",
  "Flowers",
  "Tender Coconut",
  "Tea Stall",
  "Tiffin",
];

function readSearchParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

interface VendorWithLive extends Vendor {
  isLive?: boolean;
  livePhone?: string;
  liveUpdatedAt?: number;
  flashSale?: FlashSale;
}

/** Days since an ISO date (YYYY-MM-DD), clamped to >= 0. */
function daysSinceIso(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

/** Map a vendor-entered freshness item into the customer-facing item shape. */
function freshnessToVendorItem(it: FreshnessItem): VendorItem {
  return {
    name: it.name,
    price: 0, // Freshness board doesn't capture price; UI hides ₹0 via "—".
    unit: it.qty?.trim() ? it.qty.trim() : "—",
    freshDays: daysSinceIso(it.purchasedAt),
  };
}

export function CustomerDashboard({ onSignIn }: Props) {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [center, setCenter] = useState(BENGALURU_CENTER);
  const [locStatus, setLocStatus] = useState<"loading" | "ok" | "denied" | "fallback">(
    "loading",
  );
  const [category, setCategory] = useState<VendorCategory | "All">("All");
  const [subcategory, setSubcategory] = useState<PushcartSubcategory | "All">("All");
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [vendorNotifyOpen, setVendorNotifyOpen] = useState(false);
  const [vendorNotifyTarget, setVendorNotifyTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateTarget, setRateTarget] = useState<{
    id: string;
    name: string;
    isFresh: boolean;
  } | null>(null);
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [trackPhone, setTrackPhone] = useState<string | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [liveSimEnabled, setLiveSimEnabled] = useState(true);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  /** Bumps whenever any shared cloud key changes — forces vendor cards to
   * re-derive items / freshness from the latest local cache. */
  const [dataVersion, setDataVersion] = useState(0);
  const [flashNow, setFlashNow] = useState(Date.now());
  const proximityFiredRef = useRef<Set<string>>(new Set());
  const vendorWatchFiredRef = useRef<Set<string>>(new Set());
  const isGuest = session?.role === "guest";
  const phone = session?.phone ?? "guest";

  // Seed the demo "1234" code for Mahesh's live mango cart so reviewers can
  // exercise the rating flow immediately.
  useEffect(() => {
    seedDemoCode("live_demo_live_1", "1234");
  }, []);

  // Honor URL params from CustomerHome (?sub=Fruits, ?focus=vendorId)
  useEffect(() => {
    const sub = readSearchParam("sub");
    if (sub && (PUSHCART_SUBCATEGORIES as string[]).includes(sub)) {
      setCategory("Pushcart");
      setSubcategory(sub as PushcartSubcategory);
    }
    const focus = readSearchParam("focus");
    if (focus) setSelectedId(focus);
  }, []);

  useEffect(() => {
    setFavorites(new Set(getFavorites(phone)));
    if (session?.phone) {
      setWatchedIds(
        new Set(getVendorWatches(session.phone).map((w) => w.vendorId)),
      );
    } else {
      setWatchedIds(new Set());
    }
  }, [phone, session?.phone]);

  const refreshWatches = () => {
    if (session?.phone) {
      setWatchedIds(
        new Set(getVendorWatches(session.phone).map((w) => w.vendorId)),
      );
    }
  };

  const watchIdRef = useRef<number | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("fallback");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => {
        setLocStatus("denied");
        setCenter(BENGALURU_CENTER);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    requestLocation();
    // Continuously refresh customer position so distances stay accurate as
    // they move (matches what Google Maps does on the same device).
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => {
        // Silent — initial requestLocation already set the fallback state.
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Re-derive vendor cards whenever any shared cloud key (vendors, freshness,
  // ratings, live locations, codes) changes on this device or another.
  useEffect(() => {
    return subscribeCloud(() => setDataVersion((n) => n + 1));
  }, []);

  const vendors: Vendor[] = useMemo(
    () => generateNearbyVendors(center.lat, center.lng, 18),
    [center.lat, center.lng],
  );

  /* ---------- LIVE LOCATIONS ---------- */

  // Subscribe to vendor live broadcasts.
  useEffect(() => {
    const refresh = () => setLiveLocations(getLiveLocations());
    refresh();
    return subscribeLive(refresh);
  }, []);

  // Subscribe to flash sales + tick a per-second clock so countdown badges
  // visibly draw down on the customer side.
  useEffect(() => {
    const refresh = () => setFlashSales(getFlashSales());
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
  }, []);

  // Start/stop the demo simulator. Re-seed when the customer's center moves
  // significantly so demo carts orbit around their actual position.
  useEffect(() => {
    if (liveSimEnabled) {
      startDemoLiveSimulator(center);
    } else {
      stopDemoLiveSimulator();
    }
    return () => {
      // The demo keeps running across renders by design; we only stop it on
      // explicit toggle. Cleanup happens when the simulator is disabled.
    };
  }, [liveSimEnabled, center.lat, center.lng]);

  // Stop the simulator when the dashboard unmounts so demo carts don't
  // linger when the user navigates back home.
  useEffect(() => {
    return () => {
      stopDemoLiveSimulator();
    };
  }, []);

  // Build a unified vendor list: live broadcasts first (with computed
  // distance against current customer center), then the seeded mock vendors.
  const liveAsVendors: VendorWithLive[] = useMemo(() => {
    return liveLocations.map((l) => {
      const distanceKm = haversineKm(center.lat, center.lng, l.lat, l.lng);

      // Real registered vendors broadcast their actual stock through the
      // freshness board; demo carts don't have a real account, so they fall
      // back to a small representative item list per subcategory.
      const realFresh =
        !isDemoPhone(l.phone) && !l.demo
          ? getFreshnessItems(l.phone)
          : [];

      let items: VendorItem[];
      let stockedDaysAgo: number | undefined;

      if (realFresh.length > 0) {
        items = realFresh.map(freshnessToVendorItem);
        stockedDaysAgo =
          l.subcategory === "Fruits" || l.subcategory === "Vegetables"
            ? Math.min(...items.map((i) => i.freshDays ?? 0))
            : undefined;
      } else if (isDemoPhone(l.phone) || l.demo) {
        // Demo simulator carts — keep the curated showcase items so the demo
        // experience still looks alive.
        items =
          l.subcategory === "Fruits"
            ? [
                { name: "Mango (Alphonso)", price: 280, unit: "kg", freshDays: 0 },
                { name: "Banana (Yelakki)", price: 60, unit: "dozen", freshDays: 0 },
                { name: "Sweet Lime", price: 80, unit: "kg", freshDays: 0 },
              ]
            : l.subcategory === "Vegetables"
              ? [
                  { name: "Tomato", price: 40, unit: "kg", freshDays: 0 },
                  { name: "Coriander", price: 10, unit: "bunch", freshDays: 0 },
                  { name: "Onion", price: 35, unit: "kg", freshDays: 0 },
                ]
              : l.subcategory === "Snacks"
                ? [
                    { name: "Pani Puri (12 pcs)", price: 40, unit: "plate" },
                    { name: "Bhel Puri", price: 50, unit: "plate" },
                  ]
                : l.subcategory === "Juice"
                  ? [
                      { name: "Sugarcane Juice", price: 30, unit: "glass" },
                      { name: "Tender Coconut", price: 40, unit: "piece" },
                    ]
                  : [
                      { name: "Mysore Pak", price: 350, unit: "kg" },
                      { name: "Jalebi", price: 220, unit: "kg" },
                    ];
        stockedDaysAgo =
          l.subcategory === "Fruits" || l.subcategory === "Vegetables" ? 0 : undefined;
      } else {
        // Real vendor with no listed stock yet — show an empty catalog rather
        // than fake products the vendor never added.
        items = [];
        stockedDaysAgo = undefined;
      }

      const v: VendorWithLive = {
        id: `live_${l.phone}`,
        name: l.vendorName,
        owner: l.vendorName.split(" ")[0] ?? "Vendor",
        category: "Pushcart",
        subcategory: l.subcategory,
        lat: l.lat,
        lng: l.lng,
        distanceKm,
        hype: 80,
        openNow: true,
        phone: l.phone,
        tagline: "Pushcart on the move — broadcasting live now",
        stockedDaysAgo,
        items,
        rating: { qualityAvg: 4.5, freshnessAvg: 4.7, count: 24 },
        etaMinutes: walkingEtaMinutes(distanceKm),
        isLive: true,
        livePhone: l.phone,
        liveUpdatedAt: l.updatedAt,
      };
      return v;
    });
  }, [liveLocations, center.lat, center.lng, dataVersion]);

  /** Registered vendors who aren't actively broadcasting — show them with
   * their stored coordinates and their actual freshness items so customers
   * can find them too. */
  const registeredAsVendors: VendorWithLive[] = useMemo(() => {
    const broadcasting = new Set(liveLocations.map((l) => l.phone));
    return getVendors()
      .filter(
        (v: VendorRecord) =>
          typeof v.lat === "number" && typeof v.lng === "number",
      )
      .filter((v) => !broadcasting.has(v.phone))
      .map((v) => {
        const distanceKm = haversineKm(
          center.lat,
          center.lng,
          v.lat as number,
          v.lng as number,
        );
        const fresh = getFreshnessItems(v.phone);
        const items = fresh.map(freshnessToVendorItem);
        const isPushcart = v.vendorType === "Pushcart";
        const stockedDaysAgo =
          fresh.length > 0 &&
          (v.subcategory === "Fruits" || v.subcategory === "Vegetables")
            ? Math.min(...items.map((i) => i.freshDays ?? 0))
            : undefined;
        const card: VendorWithLive = {
          id: `reg_${v.phone}`,
          name: v.name,
          owner: v.name.split(" ")[0] ?? "Vendor",
          category: isPushcart ? "Pushcart" : "Grocery",
          subcategory: isPushcart ? v.subcategory : undefined,
          lat: v.lat as number,
          lng: v.lng as number,
          distanceKm,
          hype: 50,
          openNow: true,
          phone: v.phone,
          tagline: v.description || "Local vendor",
          stockedDaysAgo,
          items,
          rating: { qualityAvg: 4.0, freshnessAvg: 4.0, count: 0 },
          etaMinutes: walkingEtaMinutes(distanceKm),
        };
        return card;
      });
  }, [center.lat, center.lng, liveLocations, dataVersion]);

  const allVendors: VendorWithLive[] = useMemo(() => {
    const merged: VendorWithLive[] = [
      ...liveAsVendors,
      ...registeredAsVendors,
      ...vendors,
    ];
    if (flashSales.length === 0) return merged;
    // Match a flash sale to a vendor by phone number (vendors with the same
    // phone as a vendor record + their live broadcast share the sale).
    const byPhone = new Map<string, FlashSale>();
    for (const s of flashSales) byPhone.set(s.vendorPhone, s);
    return merged.map((v) => {
      const sale =
        (v.phone && byPhone.get(v.phone)) ||
        (v.livePhone && byPhone.get(v.livePhone));
      return sale ? { ...v, flashSale: sale } : v;
    });
  }, [liveAsVendors, registeredAsVendors, vendors, flashSales]);

  const filtered = useMemo(() => {
    const byCategory = allVendors.filter((v) => {
      if (category !== "All" && v.category !== category) return false;
      if (
        category === "Pushcart" &&
        subcategory !== "All" &&
        v.subcategory !== subcategory
      )
        return false;
      return true;
    });
    return applyFilters(byCategory, filters);
  }, [allVendors, category, subcategory, filters]);

  // Notify-me + LIVE proximity alerts.
  // For seeded vendors: fire on each location change as before.
  // For live vendors: fire when a live cart enters the configured range
  // (deduped per vendor phone using proximityFiredRef).
  useEffect(() => {
    if (!session?.phone || isGuest) return;
    const settings = getNotifySettings(session.phone);
    if (!settings.enabled || settings.subcategories.length === 0) return;

    // Match seeded mocks
    const matched = vendors.filter(
      (v) =>
        v.category === "Pushcart" &&
        v.subcategory &&
        settings.subcategories.includes(v.subcategory) &&
        v.distanceKm <= settings.rangeKm,
    );
    if (matched.length > 0) {
      const v = matched[0]!;
      toast.message("Pushcart alert near you", {
        description: `${v.name} (${v.subcategory}) is ${v.distanceKm.toFixed(2)} km away`,
        action: { label: "View", onClick: () => setSelectedId(v.id) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // LIVE proximity — fire once per vendor when they enter range.
  useEffect(() => {
    if (!session?.phone || isGuest) return;
    const settings = getNotifySettings(session.phone);
    if (!settings.enabled || settings.subcategories.length === 0) return;
    for (const lv of liveAsVendors) {
      if (!lv.subcategory || !settings.subcategories.includes(lv.subcategory)) continue;
      if (lv.distanceKm <= settings.rangeKm) {
        if (proximityFiredRef.current.has(lv.livePhone!)) continue;
        proximityFiredRef.current.add(lv.livePhone!);
        toast.message("LIVE pushcart entering your range", {
          description: `${lv.name} is now ${lv.distanceKm.toFixed(2)} km away — moving toward you`,
          action: {
            label: "Track",
            onClick: () => {
              setTrackPhone(lv.livePhone!);
              setTrackOpen(true);
            },
          },
        });
      } else {
        // Allow re-firing once they leave the range
        proximityFiredRef.current.delete(lv.livePhone!);
      }
    }
  }, [liveAsVendors, session?.phone, isGuest]);

  // PER-VENDOR watch proximity — alerts when a specifically-watched vendor
  // is within the user-configured range. Works for both live & seeded carts.
  useEffect(() => {
    if (!session?.phone || isGuest) return;
    const watches = getVendorWatches(session.phone);
    if (watches.length === 0) return;
    for (const w of watches) {
      const v = allVendors.find((x) => x.id === w.vendorId);
      if (!v) continue;
      if (v.distanceKm <= w.rangeKm) {
        if (vendorWatchFiredRef.current.has(w.vendorId)) continue;
        vendorWatchFiredRef.current.add(w.vendorId);
        toast.message(`${w.vendorName} is here!`, {
          description: `Within ${w.rangeKm.toFixed(1)} km — currently ${v.distanceKm.toFixed(2)} km away`,
          action: {
            label: "View",
            onClick: () => {
              setSelectedId(v.id);
              setProfileOpen(true);
            },
          },
        });
      } else {
        vendorWatchFiredRef.current.delete(w.vendorId);
      }
    }
  }, [allVendors, session?.phone, isGuest, watchedIds]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setProfileOpen(true);
    const v = allVendors.find((x) => x.id === id);
    if (v) {
      pushRecentVendor(phone, {
        id: v.id,
        name: v.name,
        category: v.category,
        subcategory: v.subcategory,
        distanceKm: v.distanceKm,
        viewedAt: Date.now(),
      });
    }
  };

  const handleVendorNotify = (v: Vendor) => {
    setVendorNotifyTarget({ id: v.id, name: v.name });
    setVendorNotifyOpen(true);
  };

  const handleRate = (v: Vendor) => {
    const isFresh =
      v.category === "Pushcart" &&
      (v.subcategory === "Fruits" || v.subcategory === "Vegetables");
    setRateTarget({ id: v.id, name: v.name, isFresh });
    setRateOpen(true);
  };

  const handleFav = (v: Vendor) => {
    if (isGuest || !session) {
      toast.message("Sign in to save favourites", {
        action: { label: "Sign in", onClick: onSignIn },
      });
      return;
    }
    const isNow = toggleFavorite(phone, v.id);
    setFavorites(new Set(getFavorites(phone)));
    toast.success(isNow ? `Saved ${v.name}` : `Removed ${v.name}`);
  };

  const handleOrder = (v: Vendor) => {
    // Pushcart vendors can't take traditional pre-orders — they're moving
    // and have small inventory. Reframe as a "raise request" so the wording
    // matches reality: customer asks the vendor to set something aside.
    const isPushcart = v.category === "Pushcart";
    const verb = isPushcart ? "raise a request with" : "place an order with";

    if (isGuest || !session) {
      toast.message(isPushcart ? "Sign in to raise request" : "Sign in to order", {
        description: `Save ${v.name} and ${verb} them.`,
        action: { label: "Sign in", onClick: onSignIn },
      });
      return;
    }
    const orderId = `o_${Date.now()}`;
    const itemLabel = v.subcategory ?? v.category;
    const amount = 60 + Math.round(Math.random() * 200);
    const placedAt = Date.now();
    addOrder(phone, {
      id: orderId,
      vendorId: v.id,
      vendorName: v.name,
      item: itemLabel,
      amount,
      placedAt,
    });
    // Mirror this request into the vendor's own inbox so they see it on
    // their dashboard (across devices via cloudKv). Demo vendors have
    // synthetic phones; the write is harmless if no vendor session matches.
    if (v.phone) {
      addVendorOrder(v.phone, {
        id: orderId,
        customerPhone: phone,
        customerName: session.name ?? "Customer",
        item: itemLabel,
        amount,
        placedAt,
        status: "pending",
      });
    }
    toast.success(
      isPushcart
        ? `Request raised — ${v.name} will set it aside for you`
        : `Order request sent to ${v.name}`,
    );
  };

  const handleTrackLive = (livePhone: string) => {
    setTrackPhone(livePhone);
    setTrackOpen(true);
  };

  const greeting =
    session?.role === "customer"
      ? `Namaskara, ${session.name}`
      : "Bengaluru is buzzing right now";

  const notifySettings = session?.phone ? getNotifySettings(session.phone) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <Link
            href="/"
            className="text-xs text-muted-foreground inline-flex items-center hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> Back to home
          </Link>
          <div className="text-xs uppercase tracking-widest text-secondary font-semibold mt-2">
            Discover
          </div>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl leading-tight">
            {greeting} <span className="text-gradient-warm">— vendors near you, live.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            {locStatus === "loading" && "Finding your location..."}
            {locStatus === "ok" && (
              <>
                Live · {center.lat.toFixed(4)}, {center.lng.toFixed(4)} ·{" "}
                {vendors.length} vendors within ~1.5 km
              </>
            )}
            {locStatus === "denied" && (
              <>Showing vendors near MG Road. Enable location for live results.</>
            )}
            {locStatus === "fallback" && "Geolocation unavailable — showing Bengaluru centre."}
            {liveLocations.length > 0 && (
              <Badge className="bg-primary text-primary-foreground gap-1 ml-1">
                <span className="live-dot" /> {liveLocations.length} live now
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isGuest && (
            <Badge variant="outline" className="border-secondary text-secondary">
              Guest mode
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (isGuest) onSignIn();
              else setNotifyOpen(true);
            }}
            data-testid="button-notify"
          >
            <BellRing className="h-4 w-4 mr-1.5" /> Notify me
          </Button>
          <Button variant="outline" onClick={requestLocation} data-testid="button-recenter">
            <Locate className="h-4 w-4 mr-1.5" /> Recenter
          </Button>
        </div>
      </motion.div>

      {locStatus === "denied" && (
        <div className="rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">We couldn't get your location</div>
            <div className="text-muted-foreground">
              We're showing vendors near MG Road. Allow location access to see vendors right
              around you.
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={requestLocation}>
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs flex items-center gap-3 flex-wrap">
        <span className="live-dot" />
        <span className="font-medium text-primary">Live pushcart tracking is on</span>
        <span className="text-muted-foreground">
          Pushcarts that turn on Go-Live appear with a pulsing pin and can be tracked in
          real time.
        </span>
        <button
          onClick={() => setLiveSimEnabled((v) => !v)}
          className="ml-auto text-xs underline text-muted-foreground hover:text-foreground"
          data-testid="toggle-live-demo"
        >
          {liveSimEnabled ? "Hide demo carts" : "Show demo carts"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* MAP */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden border border-border h-[460px] sm:h-[560px]">
          <VendorMap
            center={center}
            vendors={filtered.filter((v) => !v.isLive)}
            liveLocations={liveLocations.filter((lv) =>
              filtered.some((v) => v.livePhone === lv.phone),
            )}
            selectedId={selectedId}
            onSelect={handleSelect}
            onTrackLive={handleTrackLive}
            notifyRangeKm={notifySettings?.enabled ? notifySettings.rangeKm : undefined}
          />
        </div>

        {/* LIST */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={filtered.length}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as VendorCategory | "All");
                setSubcategory("All");
              }}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category === "Pushcart" && (
              <Select
                value={subcategory}
                onValueChange={(v) => setSubcategory(v as PushcartSubcategory | "All")}
              >
                <SelectTrigger data-testid="select-subcategory">
                  <SelectValue placeholder="Pushcart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All pushcarts</SelectItem>
                  {PUSHCART_SUBCATEGORIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border border-border divide-y divide-border max-h-[520px]">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No vendors match your filters.
              </div>
            )}
            {filtered.map((v) => {
              const fresh = freshnessLabel(v.stockedDaysAgo);
              const isFav = favorites.has(v.id);
              return (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(v.id);
                    }
                  }}
                  className={`w-full text-left p-4 hover-elevate flex items-start gap-3 cursor-pointer ${
                    selectedId === v.id ? "bg-muted/50" : ""
                  } ${v.isLive ? "bg-primary/5 border-l-4 border-primary" : ""}`}
                  data-testid={`vendor-card-${v.id}`}
                >
                  <div
                    className="h-10 w-10 rounded-full grid place-items-center text-white font-semibold text-sm shrink-0"
                    style={{
                      background: v.isLive
                        ? "linear-gradient(135deg, hsl(4,82%,55%), hsl(4,82%,40%))"
                        : "linear-gradient(135deg, hsl(4,82%,60%), hsl(38,96%,60%))",
                    }}
                  >
                    {v.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">{v.name}</div>
                      {v.isLive && (
                        <Badge className="bg-primary text-primary-foreground gap-1 text-[10px]">
                          <span className="live-dot" /> LIVE
                        </Badge>
                      )}
                      {!v.isLive && v.openNow && (
                        <Badge variant="outline" className="border-accent text-accent text-[10px]">
                          Open now
                        </Badge>
                      )}
                      {!v.isLive && !v.openNow && (
                        <Badge variant="outline" className="text-[10px]">
                          Closed
                        </Badge>
                      )}
                      {fresh && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            fresh.tone === "fresh"
                              ? "border-accent text-accent"
                              : fresh.tone === "ok"
                                ? "border-secondary text-secondary"
                                : "border-amber-500 text-amber-600"
                          }`}
                          data-testid={`badge-fresh-${v.id}`}
                        >
                          <Sprout className="h-3 w-3 mr-1" />
                          {fresh.label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {v.category}
                      {v.subcategory ? ` · ${v.subcategory}` : ""} ·{" "}
                      {v.distanceKm.toFixed(2)} km · {v.tagline}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3 w-3 fill-secondary text-secondary" />
                        <span className="font-semibold text-foreground">
                          {v.rating.qualityAvg.toFixed(1)}
                        </span>
                        <span className="opacity-70">({v.rating.count})</span>
                      </span>
                      {/* ETA only makes sense for mobile pushcarts. For
                          stationary food courts, restaurants and cloud
                          kitchens, walk-time-to-vendor is misleading. */}
                      {v.category === "Pushcart" && v.etaMinutes !== undefined && (
                        <span
                          className="inline-flex items-center gap-1 text-primary"
                          data-testid={`eta-${v.id}`}
                        >
                          <Clock className="h-3 w-3" /> ~{v.etaMinutes} min walk
                        </span>
                      )}
                      {v.flashSale && (
                        <Badge
                          className="bg-secondary text-secondary-foreground gap-1 text-[10px]"
                          data-testid={`flash-badge-${v.id}`}
                        >
                          <Zap className="h-3 w-3" />
                          {v.flashSale.discount}% off ·{" "}
                          {formatRemaining(v.flashSale.endsAt, flashNow)} left
                        </Badge>
                      )}
                      {v.items.length > 0 && (
                        <span className="text-muted-foreground">
                          from{" "}
                          <span className="font-semibold text-foreground">
                            ₹
                            {v.items.reduce(
                              (m, it) => Math.min(m, it.price),
                              Infinity,
                            )}
                          </span>
                        </span>
                      )}
                      {watchedIds.has(v.id) && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary gap-1">
                          <BellRing className="h-3 w-3" /> Watching
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {v.isLive ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackLive(v.livePhone!);
                          }}
                          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                          data-testid={`button-track-${v.id}`}
                        >
                          <Radio className="h-3 w-3" /> Track live
                        </button>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          <Flame className="h-3 w-3 mr-1" /> Hype {v.hype}
                        </Badge>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFav(v);
                        }}
                        className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                          isFav
                            ? "bg-secondary/15 text-secondary"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-fav-${v.id}`}
                      >
                        <Heart
                          className={`h-3 w-3 ${isFav ? "fill-secondary" : ""}`}
                        />
                        {isFav ? "Saved" : "Save"}
                      </button>
                      {!v.isLive && (
                        <a
                          href={`tel:${v.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" /> Call
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <Navigation className="h-3 w-3" /> Directions
                      </a>
                      {!v.isLive && v.category === "Pushcart" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrder(v);
                          }}
                          className="ml-auto text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                          data-testid={`button-order-${v.id}`}
                          title="Pushcarts don't take pre-orders — raise a request and they'll set it aside for you."
                        >
                          {isGuest && <Lock className="h-3 w-3" />}
                          {isGuest ? "Sign in to request" : "Raise Request"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* unused but kept for consistency */}
      <button hidden onClick={() => navigate("/")} />

      <NotifyMeDialog open={notifyOpen} onOpenChange={setNotifyOpen} />
      <LiveTrackModal
        open={trackOpen}
        onOpenChange={setTrackOpen}
        phone={trackPhone}
        customerCenter={center}
      />

      <VendorProfileSheet
        vendor={
          selectedId
            ? (allVendors.find((v) => v.id === selectedId) ?? null)
            : null
        }
        open={profileOpen}
        onOpenChange={setProfileOpen}
        isFavorite={selectedId ? favorites.has(selectedId) : false}
        isWatched={selectedId ? watchedIds.has(selectedId) : false}
        isGuest={isGuest}
        onSignIn={onSignIn}
        onFavorite={handleFav}
        onOrder={(v) => {
          handleOrder(v);
          setProfileOpen(false);
        }}
        onTrackLive={(p) => {
          setProfileOpen(false);
          handleTrackLive(p);
        }}
        onNotifyMe={handleVendorNotify}
        onRate={handleRate}
        ratingsVersion={ratingsVersion}
      />

      <VendorNotifyDialog
        open={vendorNotifyOpen}
        onOpenChange={setVendorNotifyOpen}
        vendorId={vendorNotifyTarget?.id ?? ""}
        vendorName={vendorNotifyTarget?.name ?? ""}
        onChange={refreshWatches}
      />

      <RateVendorModal
        open={rateOpen}
        onOpenChange={setRateOpen}
        vendorId={rateTarget?.id ?? ""}
        vendorName={rateTarget?.name ?? ""}
        freshnessApplicable={rateTarget?.isFresh ?? true}
        onRated={() => setRatingsVersion((v) => v + 1)}
      />
    </main>
  );
}

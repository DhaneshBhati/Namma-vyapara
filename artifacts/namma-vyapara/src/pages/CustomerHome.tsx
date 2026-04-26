import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Map as MapIcon,
  BellRing,
  Heart,
  History,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Apple,
  Carrot,
  CupSoda,
  Cookie,
  Cake,
  Flame,
  MapPin,
  Lock,
} from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import {
  getRecentVendors,
  getFavorites,
  getNotifySettings,
  getOrders,
  type RecentVendor,
  type NotifySettings,
  type OrderRecord,
} from "@/lib/session";
import {
  PUSHCART_SUBCATEGORIES,
  type PushcartSubcategory,
} from "@/lib/vendors";
import { NotifyMeDialog } from "@/components/NotifyMeDialog";

interface Props {
  onSignIn: () => void;
}

const SUB_ICON: Record<PushcartSubcategory, typeof Apple> = {
  Fruits: Apple,
  Vegetables: Carrot,
  Snacks: Cookie,
  Juice: CupSoda,
  Sweets: Cake,
};

function timeAgo(ms: number) {
  const sec = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.round(hr / 24)} d ago`;
}

export function CustomerHome({ onSignIn }: Props) {
  const { session } = useSession();
  const [, navigate] = useLocation();
  const [recents, setRecents] = useState<RecentVendor[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [notify, setNotify] = useState<NotifySettings | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const isGuest = session?.role === "guest";
  const phone = session?.phone ?? "guest";

  useEffect(() => {
    setRecents(getRecentVendors(phone));
    setFavCount(getFavorites(phone).length);
    setOrders(getOrders(phone));
    setNotify(getNotifySettings(phone));
  }, [phone, notifyOpen]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const goDiscover = (sub?: PushcartSubcategory) => {
    if (sub) navigate(`/discover?sub=${encodeURIComponent(sub)}`);
    else navigate("/discover");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 p-6 sm:p-10"
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/15" />
        <div className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl -z-10" />

        <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
          {greeting}
        </div>
        <h1 className="mt-1 font-serif text-3xl sm:text-5xl leading-tight">
          Namaskara,{" "}
          <span className="text-gradient-warm">
            {isGuest ? "Guest" : session?.name?.split(" ")[0] ?? "friend"}
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Your hyperlocal market is right around you. Track recent stalls, set notifications
          for fresh pushcarts, and pick up where you left off.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={() => goDiscover()}
            className="glow-primary"
            data-testid="button-home-discover"
          >
            <MapIcon className="h-4 w-4 mr-1.5" />
            Open live map
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              if (isGuest) {
                onSignIn();
                return;
              }
              setNotifyOpen(true);
            }}
            data-testid="button-home-notify"
          >
            <BellRing className="h-4 w-4 mr-1.5" />
            {isGuest ? "Sign in to set alerts" : "Set notify-me"}
          </Button>
        </div>
      </motion.section>

      {/* QUICK STATS */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 hover-elevate">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Recent stalls
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center">
              <History className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 font-serif text-4xl">{recents.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            tracked from your visits
          </div>
        </Card>
        <Card className="p-5 hover-elevate">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Saved favourites
            </div>
            <div className="h-9 w-9 rounded-lg bg-secondary/15 grid place-items-center">
              <Heart className="h-4 w-4 text-secondary" />
            </div>
          </div>
          <div className="mt-3 font-serif text-4xl">{favCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            vendors you can reorder from
          </div>
        </Card>
        <Card className="p-5 hover-elevate">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Notifications
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent/15 grid place-items-center">
              <BellRing className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="mt-3 font-serif text-4xl">
            {notify?.enabled ? `${notify.rangeKm} km` : "Off"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {notify?.enabled
              ? `Alerting for ${notify.subcategories.join(", ")}`
              : "Set a range to get alerts"}
          </div>
        </Card>
      </section>

      {/* PUSHCART CATEGORIES */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
              Pushcart corner
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl">
              Browse pushcarts by what you crave
            </h2>
          </div>
          <Button variant="ghost" onClick={() => goDiscover()} data-testid="button-explore-all">
            Explore all <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {PUSHCART_SUBCATEGORIES.map((s) => {
            const Icon = SUB_ICON[s];
            return (
              <button
                key={s}
                onClick={() => goDiscover(s)}
                className="group rounded-2xl border border-border bg-card p-5 text-left hover-elevate transition-all"
                data-testid={`tile-pushcart-${s}`}
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 grid place-items-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-semibold">{s}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Find {s.toLowerCase()} carts near you
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RECENT TRACKING */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Recently visited</h2>
            {recents.length > 0 && (
              <Badge variant="outline">Last 8 stalls</Badge>
            )}
          </div>
          <div className="mt-4 rounded-2xl border border-border divide-y divide-border bg-card">
            {recents.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Sparkles className="h-5 w-5 text-secondary mx-auto mb-2" />
                You haven't viewed any stalls yet. Open the live map to start exploring.
                <div className="mt-4">
                  <Button onClick={() => goDiscover()}>
                    <MapIcon className="h-4 w-4 mr-1.5" /> Browse vendors near me
                  </Button>
                </div>
              </div>
            ) : (
              recents.map((r) => (
                <button
                  key={r.id + r.viewedAt}
                  onClick={() => navigate(`/discover?focus=${r.id}`)}
                  className="w-full flex items-center gap-3 p-4 text-left hover-elevate"
                  data-testid={`recent-${r.id}`}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary grid place-items-center text-white font-semibold">
                    {r.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.category}
                      {r.subcategory ? ` · ${r.subcategory}` : ""} ·{" "}
                      {r.distanceKm.toFixed(2)} km
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <History className="h-3 w-3" /> {timeAgo(r.viewedAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              <div className="font-semibold">Set up notify-me</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Get a ping when a fruit or vegetable cart enters your range. Currently{" "}
              <span className="font-medium">
                {notify?.enabled
                  ? `${notify.rangeKm} km · ${notify.subcategories.join(", ")}`
                  : "off"}
              </span>
              .
            </p>
            <Button
              className="mt-4 w-full"
              variant={notify?.enabled ? "outline" : "default"}
              onClick={() => {
                if (isGuest) {
                  onSignIn();
                  return;
                }
                setNotifyOpen(true);
              }}
              data-testid="button-side-notify"
            >
              {isGuest && <Lock className="h-4 w-4 mr-1.5" />}
              {notify?.enabled ? "Edit preferences" : "Turn on notifications"}
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-secondary" />
              <div className="font-semibold">Recent orders</div>
            </div>
            <div className="mt-3 space-y-2">
              {orders.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No orders yet — your past purchases will show up here.
                </div>
              )}
              {orders.slice(0, 4).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.item}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.vendorName} · {timeAgo(o.placedAt)}
                    </div>
                  </div>
                  <div className="font-semibold">₹{o.amount}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <div className="font-semibold">Your delivery area</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              We use your live location to show pushcarts in walking distance. You can
              recenter anytime from the map.
            </p>
          </Card>
        </aside>
      </section>

      <NotifyMeDialog open={notifyOpen} onOpenChange={setNotifyOpen} />
    </main>
  );
}

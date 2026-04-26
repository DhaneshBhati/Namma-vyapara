import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  MapPin,
  Flame,
  Eye,
  ShoppingBag,
  Zap,
  ListChecks,
  ChevronLeft,
  Store,
  Clock,
  Megaphone,
  Sprout,
  Accessibility,
  X,
} from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import {
  getVendors,
  getVendorOrders,
  setVendorOrderStatus,
  type VendorRecord,
  type VendorOrderRecord,
} from "@/lib/session";
import { subscribeCloud } from "@/lib/cloudKv";
import { FreshnessBoard } from "@/components/vendor/FreshnessBoard";
import { LiveBroadcast } from "@/components/vendor/LiveBroadcast";
import { EasyActionPanel } from "@/components/vendor/EasyActionPanel";
import { PurchaseCodePanel } from "@/components/vendor/PurchaseCodePanel";
import { VendorRatingsPanel } from "@/components/vendor/VendorRatingsPanel";
import {
  setFlashSale,
  clearFlashSale,
  getFlashSaleFor,
  subscribeFlashSales,
  formatRemaining,
  type FlashSale,
} from "@/lib/flashSale";
import { speak } from "@/lib/voice";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const EASY_MODE_KEY = "nv_easy_mode";

export function VendorDashboard() {
  const { session, signOut } = useSession();
  const { lang } = useLanguage();
  const [discount, setDiscount] = useState(15);
  const [flashMinutes, setFlashMinutes] = useState(30);
  const [flashMessage, setFlashMessage] = useState("");
  const [flashOpen, setFlashOpen] = useState(false);
  const [activeFlash, setActiveFlash] = useState<FlashSale | null>(null);
  const [flashNow, setFlashNow] = useState(Date.now());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [stallOpen, setStallOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [annOpen, setAnnOpen] = useState(false);
  const [easyMode, setEasyMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(EASY_MODE_KEY) === "1";
  });
  const [orders, setOrders] = useState<VendorOrderRecord[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  /** Tracks order ids we've already shown a "new request" toast for, so the
   *  vendor doesn't get re-notified about the same order on every poll. */
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const ordersInitializedRef = useRef(false);

  useEffect(() => {
    if (!session?.phone) return;
    const v = getVendors().find((x) => x.phone === session.phone) ?? null;
    setVendor(v);
    if (v?.lat && v?.lng) setCoords({ lat: v.lat, lng: v.lng });
  }, [session?.phone]);

  useEffect(() => {
    localStorage.setItem(EASY_MODE_KEY, easyMode ? "1" : "0");
  }, [easyMode]);

  // Live-sync incoming customer requests for THIS vendor. Pop a toast
  // (with an audible "Tring!" via the existing speak() helper) on every new
  // request so the vendor notices it immediately, even if their dashboard
  // tab isn't focused on the orders panel.
  useEffect(() => {
    const phone = session?.phone;
    if (!phone) return;

    const refresh = () => {
      const list = getVendorOrders(phone);
      setOrders(list);
      // First load on this device — seed "seen" set without firing toasts
      // for older requests the vendor hasn't viewed yet (we don't want a
      // wall of toasts after a refresh). Pending ones still appear in the
      // unread badge so they're not missed.
      if (!ordersInitializedRef.current) {
        for (const o of list) seenOrderIdsRef.current.add(o.id);
        ordersInitializedRef.current = true;
        return;
      }
      for (const o of list) {
        if (seenOrderIdsRef.current.has(o.id)) continue;
        seenOrderIdsRef.current.add(o.id);
        if (o.status !== "pending") continue;
        toast.success(`New request from ${o.customerName}`, {
          description: `${o.item} · ₹${o.amount}`,
          action: {
            label: "View",
            onClick: () => setOrdersOpen(true),
          },
          duration: 8000,
        });
        speak(
          lang === "kn-IN"
            ? `${o.customerName} ರಿಂದ ಹೊಸ ಆದೇಶ.`
            : lang === "hi-IN"
              ? `${o.customerName} से नया अनुरोध।`
              : `New request from ${o.customerName}.`,
          lang,
        );
      }
    };

    refresh();
    const unsub = subscribeCloud((key) => {
      // Only react to writes that target *this vendor's* inbox (or a
      // bulk-snapshot refresh signaled with key="*").
      if (!key || key === "*" || key === `nv_vendor_orders_${phone}`) {
        refresh();
      }
    });
    return () => unsub();
  }, [session?.phone, lang]);

  const pendingOrderCount = orders.filter((o) => o.status === "pending").length;

  const respondToOrder = (id: string, status: "accepted" | "declined") => {
    const phone = session?.phone;
    if (!phone) return;
    setVendorOrderStatus(phone, id, status);
    setOrders(getVendorOrders(phone));
    toast.success(
      status === "accepted" ? "Request accepted" : "Request declined",
    );
  };

  // Subscribe to flash sale state and tick every second so the countdown
  // visibly draws down. Auto-clears once the timer expires.
  useEffect(() => {
    const phone = session?.phone;
    if (!phone) return;
    const refresh = () => setActiveFlash(getFlashSaleFor(phone));
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
  }, [session?.phone]);

  const showFreshness =
    vendor?.vendorType === "Pushcart" &&
    (vendor?.subcategory === "Fruits" || vendor?.subcategory === "Vegetables");

  const updateLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        toast.success(`Location pinned · ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
      },
      () => toast.error("Could not update location"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleEasyAnnounce = (text: string, srcLang: typeof lang) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    toast.success(
      `Announcement sent: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? "…" : ""}"`,
    );
    // Voice over the announcement so the vendor hears it being broadcast.
    speak(trimmed, srcLang);
  };

  const launchFlashSale = () => {
    if (!session?.phone || !vendor) {
      toast.error("Please complete your vendor profile first");
      return;
    }
    const startedAt = Date.now();
    const sale: FlashSale = {
      vendorPhone: session.phone,
      vendorName: vendor.name,
      vendorType: vendor.vendorType,
      subcategory: vendor.subcategory,
      discount,
      message: flashMessage.trim() || undefined,
      startedAt,
      endsAt: startedAt + flashMinutes * 60_000,
    };
    setFlashSale(sale);
    setActiveFlash(sale);
    setFlashOpen(false);
    toast.success(
      `Flash sale live · ${discount}% off for ${flashMinutes} minutes`,
    );
    speak(
      lang === "kn-IN"
        ? `ಫ್ಲ್ಯಾಶ್ ಸೇಲ್ ಪ್ರಾರಂಭ. ${discount} ಪ್ರತಿಶತ ರಿಯಾಯಿತಿ.`
        : lang === "hi-IN"
          ? `फ्लैश सेल शुरू। ${discount} प्रतिशत छूट।`
          : `Flash sale started. ${discount} percent off for ${flashMinutes} minutes.`,
      lang,
    );
  };

  const stopFlashSale = () => {
    if (!session?.phone) return;
    clearFlashSale(session.phone);
    setActiveFlash(null);
    toast.message("Flash sale ended");
    speak(
      lang === "kn-IN"
        ? "ಫ್ಲ್ಯಾಶ್ ಸೇಲ್ ಮುಗಿದಿದೆ."
        : lang === "hi-IN"
          ? "फ्लैश सेल समाप्त।"
          : "Flash sale ended.",
      lang,
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-secondary font-semibold flex items-center gap-2">
            <Store className="h-3.5 w-3.5" /> Vendor dashboard
          </div>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl">
            Welcome back, <span className="text-gradient-warm">{session?.name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            {vendor?.vendorType ?? "Pushcart"}
            {vendor?.subcategory && (
              <Badge variant="outline" className="border-secondary/40 text-secondary">
                {vendor.subcategory}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              easyMode ? "border-secondary bg-secondary/10" : "border-border"
            }`}
          >
            <Accessibility
              className={`h-4 w-4 ${easyMode ? "text-secondary" : "text-muted-foreground"}`}
            />
            <div className="text-xs">
              <div className="font-medium">Easy Mode</div>
              <div className="text-[10px] text-muted-foreground">
                Big buttons, voice help
              </div>
            </div>
            <Switch
              checked={easyMode}
              onCheckedChange={setEasyMode}
              data-testid="switch-easy-mode"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => signOut()}
            data-testid="button-back-home"
          >
            <ChevronLeft className="h-4 w-4 mr-1.5" />
            Back to Homepage
          </Button>
        </div>
      </div>

      {/* EASY MODE PANEL */}
      {easyMode && vendor && (
        <EasyActionPanel
          vendorName={vendor.name}
          stallOpen={stallOpen}
          onStallChange={setStallOpen}
          onAnnounce={handleEasyAnnounce}
        />
      )}

      {/* LIVE BROADCAST — pushcarts especially benefit from this */}
      {vendor && (
        <LiveBroadcast
          vendor={vendor}
          large={easyMode}
          active={stallOpen}
          onActiveChange={setStallOpen}
        />
      )}

      {/* ACTIVE FLASH SALE BANNER */}
      {activeFlash && (
        <Card
          className="p-4 sm:p-5 border-2 border-secondary/60 bg-gradient-to-r from-secondary/15 via-primary/10 to-transparent"
          data-testid="card-flash-sale-active"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-lg bg-secondary text-secondary-foreground grid place-items-center">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-secondary font-semibold">
                  Flash sale live
                </div>
                <div className="font-serif text-2xl">
                  {activeFlash.discount}% off ·{" "}
                  <span className="font-mono text-primary">
                    {formatRemaining(activeFlash.endsAt, flashNow)}
                  </span>{" "}
                  left
                </div>
                {activeFlash.message && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    "{activeFlash.message}"
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Customers nearby see this discount on your stall card.
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={stopFlashSale}
              data-testid="button-flash-stop"
            >
              <X className="h-4 w-4 mr-1.5" /> End sale
            </Button>
          </div>
        </Card>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Today's views
            </div>
            <div className="h-9 w-9 rounded-lg bg-accent/15 grid place-items-center">
              <Eye className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div className="mt-3 font-serif text-4xl">45</div>
          <div className="text-xs text-muted-foreground mt-1">customers viewed your stall</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Hype score
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center">
              <Flame className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 font-serif text-4xl">32</div>
          <div className="text-xs text-muted-foreground mt-1">trending in your area</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Pending orders
            </div>
            <div className="h-9 w-9 rounded-lg bg-secondary/15 grid place-items-center">
              <ShoppingBag className="h-4 w-4 text-secondary" />
            </div>
          </div>
          <div className="mt-3 font-serif text-4xl">{pendingOrderCount}</div>
          <div className="text-xs text-muted-foreground mt-1">awaiting your confirmation</div>
        </Card>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Quick actions
          </div>
          <div className="mt-4 grid sm:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover-elevate"
              onClick={updateLocation}
              data-testid="button-update-location"
            >
              <MapPin className="h-5 w-5 text-accent" />
              Pin Location
              {coords && (
                <span className="text-[10px] text-muted-foreground">
                  {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover-elevate"
              onClick={() => setFlashOpen(true)}
              data-testid="button-flash-sale"
            >
              <Zap className="h-5 w-5 text-secondary" />
              Flash Sale
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover-elevate"
              onClick={() => setAnnOpen(true)}
              data-testid="button-announce"
            >
              <Megaphone className="h-5 w-5 text-primary" />
              Announce
            </Button>
            <Sheet open={ordersOpen} onOpenChange={setOrdersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 hover-elevate relative"
                  data-testid="button-view-orders"
                >
                  <ListChecks className="h-5 w-5 text-primary" />
                  View Orders
                  {pendingOrderCount > 0 && (
                    <span
                      className="absolute top-2 right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground"
                      data-testid="badge-pending-orders"
                    >
                      {pendingOrderCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96">
                <SheetHeader>
                  <SheetTitle>Customer requests</SheetTitle>
                  <SheetDescription>
                    {orders.length === 0
                      ? "No requests yet — they'll show up here in real time."
                      : `${pendingOrderCount} pending · ${orders.length} total`}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-9rem)] pr-1">
                  {orders.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Waiting for your first customer request.
                    </div>
                  )}
                  {orders.map((o) => {
                    const mins = Math.max(
                      0,
                      Math.round((Date.now() - o.placedAt) / 60000),
                    );
                    const ago =
                      mins === 0
                        ? "just now"
                        : mins < 60
                          ? `${mins} min ago`
                          : `${Math.round(mins / 60)} hr ago`;
                    return (
                      <div
                        key={o.id}
                        className="rounded-lg border border-border p-4 hover-elevate"
                        data-testid={`row-order-${o.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{o.item}</div>
                          <Badge variant="outline">₹{o.amount}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Clock className="h-3 w-3" /> {ago} · {o.customerName}
                        </div>
                        {o.status === "pending" ? (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => respondToOrder(o.id, "accepted")}
                              data-testid={`button-accept-${o.id}`}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => respondToOrder(o.id, "declined")}
                              data-testid={`button-decline-${o.id}`}
                            >
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Badge
                              variant={o.status === "accepted" ? "default" : "secondary"}
                            >
                              {o.status === "accepted" ? "Accepted" : "Declined"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            About your stall
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-secondary" />
              <span className="font-medium">{vendor?.name ?? session?.name}</span>
            </div>
            <div className="text-muted-foreground">
              Type: {vendor?.vendorType ?? session?.vendorType ?? "Pushcart"}
              {vendor?.subcategory ? ` · ${vendor.subcategory}` : ""}
            </div>
            {session?.phone && (
              <div className="text-muted-foreground">Phone: {session.phone}</div>
            )}
            {vendor?.description && (
              <div className="text-muted-foreground italic">"{vendor.description}"</div>
            )}
          </div>
        </Card>
      </div>

      {/* FRESHNESS BOARD — only for fruit/vegetable pushcarts */}
      {showFreshness && session?.phone && (
        <FreshnessBoard
          vendorPhone={session.phone}
          subcategory={vendor?.subcategory}
        />
      )}

      {/* RATINGS + PURCHASE CODE — for verified ratings */}
      {session?.phone && (
        <div className="grid gap-4 md:grid-cols-2">
          <PurchaseCodePanel
            vendorId={`live_${session.phone}`}
            vendorName={vendor?.name ?? session.name}
          />
          <VendorRatingsPanel vendorId={`live_${session.phone}`} />
        </div>
      )}

      {!showFreshness && vendor?.vendorType === "Pushcart" && (
        <Card className="p-6 border-dashed">
          <div className="flex items-start gap-3">
            <Sprout className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold">Stock freshness</div>
              <p className="text-sm text-muted-foreground mt-1">
                Freshness tracking is available for fruit & vegetable pushcarts. Update
                your stall in your profile to enable this.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={flashOpen} onOpenChange={setFlashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a flash sale</DialogTitle>
            <DialogDescription>
              Push a limited-time discount to customers nearby. The sale stays
              active until the timer runs out — or end it early any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Discount</div>
                <div className="text-sm font-semibold text-secondary">{discount}%</div>
              </div>
              <Slider
                value={[discount]}
                onValueChange={(v) => setDiscount(v[0]!)}
                min={5}
                max={50}
                step={5}
                className="mt-3"
                data-testid="slider-discount"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Duration</div>
                <div className="text-sm font-semibold text-primary">
                  {flashMinutes} min
                </div>
              </div>
              <Slider
                value={[flashMinutes]}
                onValueChange={(v) => setFlashMinutes(v[0]!)}
                min={5}
                max={180}
                step={5}
                className="mt-3"
                data-testid="slider-flash-duration"
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                Auto-ends after this many minutes. Vendor + customer both see a
                live countdown.
              </div>
            </div>
            <div>
              <div className="text-sm mb-1.5">Optional message</div>
              <Input
                value={flashMessage}
                onChange={(e) => setFlashMessage(e.target.value)}
                placeholder="First 10 customers get extra mango free"
                data-testid="input-flash-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlashOpen(false)}>
              Cancel
            </Button>
            <Button onClick={launchFlashSale} data-testid="button-confirm-flash">
              Go live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={annOpen} onOpenChange={setAnnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send an announcement</DialogTitle>
            <DialogDescription>
              Broadcast a quick update to customers near you. We'll also speak
              it aloud once so you know what went out.
            </DialogDescription>
          </DialogHeader>
          <textarea
            rows={4}
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Today's special: hot bonda combo at ₹40"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="textarea-announce"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const t = announcement.trim();
                if (!t) {
                  toast.error("Type a message first");
                  return;
                }
                toast.success("Announcement sent to nearby customers");
                speak(t, lang);
                setAnnouncement("");
                setAnnOpen(false);
              }}
              data-testid="button-confirm-announce"
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

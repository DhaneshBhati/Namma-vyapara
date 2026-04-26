import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Radio, MapPin, Clock, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  setLiveLocation,
  clearLiveLocation,
  type LiveLocation,
} from "@/lib/liveLocation";
import { speak } from "@/lib/voice";
import { useLanguage } from "@/contexts/LanguageContext";
import type { VendorRecord } from "@/lib/session";

interface Props {
  vendor: VendorRecord;
  /** Easy-mode renders an extra-large card with bigger text + speaker icons. */
  large?: boolean;
  /** External control: when true, broadcast turns on; when false, it stops. */
  active?: boolean;
  /** Notify parent that the broadcast state changed (user toggled UI). */
  onActiveChange?: (active: boolean) => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function LiveBroadcast({
  vendor,
  large = false,
  active,
  onActiveChange,
}: Props) {
  const [live, setLive] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const watchRef = useRef<number | null>(null);
  const liveRef = useRef(false); // mirror of `live` for use inside callbacks
  const { lang } = useLanguage();
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // ticker for showing relative durations
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stop = (silent = false) => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    clearLiveLocation(vendor.phone);
    liveRef.current = false;
    setLive(false);
    setCoords(null);
    setStartedAt(null);
    setUpdatedAt(null);
    if (!silent) {
      toast.message("Live sharing stopped");
      speak(
        langRef.current === "kn-IN"
          ? "ಲೈವ್ ಪ್ರಸಾರ ನಿಂತಿದೆ."
          : langRef.current === "hi-IN"
            ? "लाइव शेयरिंग रुक गई है।"
            : "Live broadcast stopped.",
        langRef.current,
      );
    }
    onActiveChange?.(false);
  };

  const start = () => {
    if (watchRef.current !== null) return; // already running
    if (!navigator.geolocation) {
      toast.error("Location not available on this device");
      speak(
        langRef.current === "kn-IN"
          ? "ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ."
          : langRef.current === "hi-IN"
            ? "स्थान उपलब्ध नहीं है।"
            : "Location is not available on your phone.",
        langRef.current,
      );
      return;
    }
    const begin = Date.now();
    setStartedAt(begin);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const t = Date.now();
        setCoords(c);
        setUpdatedAt(t);
        const loc: LiveLocation = {
          phone: vendor.phone,
          vendorName: vendor.name,
          vendorType: vendor.vendorType,
          subcategory: vendor.subcategory,
          lat: c.lat,
          lng: c.lng,
          updatedAt: t,
          startedAt: begin,
        };
        setLiveLocation(loc);
        // Use the ref to avoid replaying the "you are live" voice every tick.
        if (!liveRef.current) {
          liveRef.current = true;
          setLive(true);
          toast.success("You are now live — customers can see your cart");
          speak(
            langRef.current === "kn-IN"
              ? "ನೀವು ಲೈವ್ ಆಗಿದ್ದೀರಿ. ಗ್ರಾಹಕರು ನಿಮ್ಮ ಗಾಡಿಯನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ನೋಡುತ್ತಾರೆ."
              : langRef.current === "hi-IN"
                ? "आप अब लाइव हैं। ग्राहक नक्शे पर आपकी गाड़ी देख सकते हैं।"
                : "You are now live. Customers can see your cart on the map.",
            langRef.current,
          );
          onActiveChange?.(true);
        }
      },
      (err) => {
        toast.error(`Could not get location — ${err.message}`);
        speak(
          langRef.current === "kn-IN"
            ? "ಸ್ಥಳ ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಅನುಮತಿ ನೀಡಿ."
            : langRef.current === "hi-IN"
              ? "स्थान नहीं मिल सका। कृपया अनुमति दें।"
              : "Could not get your location. Please allow location permission.",
          langRef.current,
        );
        stop(true);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
    watchRef.current = id;
  };

  // Stop on unmount so a vendor logging out doesn't keep broadcasting.
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
      clearLiveLocation(vendor.phone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync with external `active` prop (Open Stall / Close Stall).
  useEffect(() => {
    if (active === undefined) return;
    if (active && !liveRef.current) {
      start();
    } else if (!active && liveRef.current) {
      stop(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const stale = updatedAt !== null && now - updatedAt > 30_000;

  return (
    <Card
      className={`p-6 border-2 ${
        live ? "border-primary/60 bg-primary/5" : "border-dashed"
      }`}
      data-testid="card-live-broadcast"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid place-items-center rounded-lg shrink-0 ${
            large ? "h-14 w-14" : "h-10 w-10"
          } ${live ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Radio className={large ? "h-7 w-7" : "h-5 w-5"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`font-semibold ${large ? "text-xl" : ""}`}>
              {live ? "You are LIVE" : "Share live location"}
            </div>
            {live && (
              <Badge className="bg-primary text-primary-foreground gap-1">
                <span className="live-dot" /> Broadcasting
              </Badge>
            )}
            {stale && live && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Weak signal
              </Badge>
            )}
          </div>
          <p
            className={`text-muted-foreground mt-1 ${large ? "text-base" : "text-sm"}`}
          >
            {live
              ? "Customers nearby see a pulsing pin where your cart is right now."
              : "Turn this on so customers walking by can find you. Switch off when you stop selling."}
          </p>

          {large && (
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">
                ಗ್ರಾಹಕರಿಗೆ ನಿಮ್ಮ ಗಾಡಿಯ ಸ್ಥಳ ತೋರಿಸಿ
              </span>
            </div>
          )}

          {live && (
            <>
              <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="font-mono text-xs">
                      {coords
                        ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                        : "Acquiring..."}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-secondary mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Live for</div>
                    <div className="font-medium">
                      {startedAt ? formatDuration(now - startedAt) : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-accent mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground">Last update</div>
                    <div className="font-medium">
                      {updatedAt
                        ? `${Math.max(1, Math.floor((now - updatedAt) / 1000))}s ago`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Always-visible Stop Sharing button when broadcasting */}
              <Button
                variant="destructive"
                className="mt-4"
                onClick={() => stop(false)}
                data-testid="button-stop-sharing"
              >
                <X className="h-4 w-4 mr-1.5" />
                Stop sharing
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {large ? (
            <Button
              size="lg"
              variant={live ? "destructive" : "default"}
              className="h-14 px-6 text-base"
              onClick={() => {
                if (live) {
                  stop(false);
                } else {
                  start();
                }
              }}
              data-testid="button-toggle-live"
            >
              <Radio className="h-5 w-5 mr-2" />
              {live ? "Stop" : "Go Live"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {live ? "On" : "Off"}
              </span>
              <Switch
                checked={live}
                onCheckedChange={(v) => {
                  if (v) start();
                  else stop(false);
                }}
                data-testid="switch-live-broadcast"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

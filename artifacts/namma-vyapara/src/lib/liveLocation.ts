/**
 * Live location broadcasting — vendors push their current GPS position to
 * localStorage; customers subscribe and see live pulsing markers on the
 * map. Cross-tab sync via the `storage` event; same-tab sync via a custom
 * event so the same browser tab also reflects updates immediately.
 */

import type { PushcartSubcategory } from "./vendors";
import { getRaw, setRaw, subscribeCloud } from "./cloudKv";

export interface LiveLocation {
  phone: string;
  vendorName: string;
  vendorType?: "Pushcart" | "Local Shop";
  subcategory?: PushcartSubcategory;
  lat: number;
  lng: number;
  updatedAt: number;
  startedAt: number;
  /** True when the entry is from the demo simulator (not a real vendor). */
  demo?: boolean;
}

const KEY = "nv_live_locations";
const EVT = "nv_live_locations_changed";
/** Locations older than this are considered stale and dropped from results. */
export const LIVE_TTL_MS = 90_000;

function read(): Record<string, LiveLocation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = getRaw(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LiveLocation>;
  } catch {
    return {};
  }
}

function write(map: Record<string, LiveLocation>) {
  setRaw(KEY, JSON.stringify(map));
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* no-op */
  }
}

export function getLiveLocations(): LiveLocation[] {
  const map = read();
  const now = Date.now();
  return Object.values(map).filter((l) => now - l.updatedAt <= LIVE_TTL_MS);
}

export function setLiveLocation(loc: LiveLocation) {
  const map = read();
  map[loc.phone] = loc;
  write(map);
}

export function clearLiveLocation(phone: string) {
  const map = read();
  delete map[phone];
  write(map);
}

/** Subscribe to live-location changes; returns unsubscribe. */
export function subscribeLive(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", storageHandler);
  // Cloud poll updates from other devices.
  const unsubCloud = subscribeCloud((key) => {
    if (!key || key === KEY) cb();
  });
  // Also tick periodically so stale entries fall off the UI.
  const interval = window.setInterval(cb, 5_000);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", storageHandler);
    unsubCloud();
    window.clearInterval(interval);
  };
}

/* ------------------- DEMO SIMULATOR ------------------- */
/**
 * Seeds 3 fake "live" pushcarts moving slowly around the customer's center
 * so the live-tracking experience can be demonstrated in a single browser
 * (without needing a second device acting as a vendor).
 */

const DEMO_PHONES = ["demo_live_1", "demo_live_2", "demo_live_3"];
const DEMO_VENDORS: Array<{
  phone: string;
  vendorName: string;
  subcategory: PushcartSubcategory;
}> = [
  { phone: "demo_live_1", vendorName: "Mahesh Mango Cart", subcategory: "Fruits" },
  { phone: "demo_live_2", vendorName: "Suresh Sabzi Bandi", subcategory: "Vegetables" },
  { phone: "demo_live_3", vendorName: "Ravi Bhel Pushcart", subcategory: "Snacks" },
];

let demoIntervalId: number | null = null;

interface DemoState {
  origin: { lat: number; lng: number };
  centers: Array<{ lat: number; lng: number; angle: number; radius: number; speed: number }>;
}

let demoState: DemoState | null = null;

export function startDemoLiveSimulator(center: { lat: number; lng: number }) {
  if (typeof window === "undefined") return;
  // Always re-seed against the latest customer center so demo carts orbit
  // around the user, no matter how many times they recenter.
  demoState = {
    origin: { ...center },
    centers: DEMO_VENDORS.map((_, i) => ({
      lat: center.lat,
      lng: center.lng,
      angle: (i * Math.PI * 2) / DEMO_VENDORS.length,
      radius: 0.0035 + i * 0.0015,
      speed: 0.06 + i * 0.02,
    })),
  };
  // Initial push so customer immediately sees them.
  tickDemo();
  if (demoIntervalId !== null) return;
  demoIntervalId = window.setInterval(tickDemo, 3500);
}

export function stopDemoLiveSimulator() {
  if (demoIntervalId !== null) {
    window.clearInterval(demoIntervalId);
    demoIntervalId = null;
  }
  for (const p of DEMO_PHONES) clearLiveLocation(p);
  demoState = null;
}

function tickDemo() {
  if (!demoState) return;
  const now = Date.now();
  demoState.centers.forEach((c, i) => {
    c.angle += c.speed;
    const lat = demoState!.origin.lat + Math.cos(c.angle) * c.radius;
    const lng =
      demoState!.origin.lng +
      (Math.sin(c.angle) * c.radius) /
        Math.cos((demoState!.origin.lat * Math.PI) / 180);
    const v = DEMO_VENDORS[i]!;
    setLiveLocation({
      phone: v.phone,
      vendorName: v.vendorName,
      vendorType: "Pushcart",
      subcategory: v.subcategory,
      lat,
      lng,
      updatedAt: now,
      startedAt: c.angle === (i * Math.PI * 2) / DEMO_VENDORS.length ? now : now - 60_000,
      demo: true,
    });
  });
}

export function isDemoPhone(phone: string): boolean {
  return phone.startsWith("demo_live_");
}

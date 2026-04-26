/**
 * Persistent flash-sale broadcast. A vendor starts a flash sale with a
 * discount + duration; both the vendor dashboard and the customer dashboard
 * read this storage key and reflect the sale until it expires.
 */

export interface FlashSale {
  vendorPhone: string;
  vendorName: string;
  vendorType?: string;
  subcategory?: string;
  /** Percent off, integer, e.g. 15 means 15%. */
  discount: number;
  /** Optional short message ("First 10 customers get extra mango free"). */
  message?: string;
  startedAt: number;
  /** Epoch ms when the sale stops being active. */
  endsAt: number;
}

const KEY = "nv_flash_sales";

export function getFlashSales(): FlashSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FlashSale[];
    if (!Array.isArray(parsed)) return [];
    // Drop expired entries on every read so callers always get a clean list.
    const now = Date.now();
    const live = parsed.filter((s) => s.endsAt > now);
    if (live.length !== parsed.length) writeAll(live);
    return live;
  } catch {
    return [];
  }
}

function writeAll(items: FlashSale[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  try {
    window.dispatchEvent(new Event("nv:flashSales"));
  } catch {
    /* no-op */
  }
}

export function setFlashSale(sale: FlashSale) {
  const list = getFlashSales().filter((s) => s.vendorPhone !== sale.vendorPhone);
  list.push(sale);
  writeAll(list);
}

export function getFlashSaleFor(vendorPhone: string): FlashSale | null {
  return getFlashSales().find((s) => s.vendorPhone === vendorPhone) ?? null;
}

export function clearFlashSale(vendorPhone: string) {
  const list = getFlashSales().filter((s) => s.vendorPhone !== vendorPhone);
  writeAll(list);
}

export function subscribeFlashSales(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("nv:flashSales", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("nv:flashSales", handler);
    window.removeEventListener("storage", handler);
  };
}

export function formatRemaining(endsAt: number, now: number = Date.now()): string {
  const ms = Math.max(0, endsAt - now);
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

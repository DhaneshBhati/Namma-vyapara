/**
 * Firestore-backed key/value store. Mirrors a small set of "shared" keys
 * across all devices using a single `kv` collection — each shared key is
 * a document `kv/<key>` with a `value` field holding the serialised JSON
 * blob.
 *
 * Reads stay synchronous (we keep a hot in-memory cache hydrated from a
 * realtime snapshot listener + a localStorage fallback) so existing call
 * sites that expect sync access don't need to be rewritten as async.
 *
 * Writes update the cache immediately, persist to localStorage, and POST
 * to Firestore in the background. The realtime listener takes care of
 * propagating remote writes from other devices into the same cache.
 */

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { firestore } from "./firebase";

const CHANGE_EVENT = "nv_cloud_changed";
const KV_COLLECTION = "kv";

export const SHARED_KEYS = [
  "namma_vyapara_customers",
  "namma_vyapara_vendors",
  "namma_vendor_codes",
  "namma_ratings",
  "nv_live_locations",
] as const;

/**
 * Per-vendor keys (each vendor writes to their own slot) that must also
 * be visible to other devices. Matched by prefix.
 */
export const SHARED_PREFIXES = ["nv_fresh_", "nv_vendor_orders_"] as const;

export type SharedKey = (typeof SHARED_KEYS)[number];

const sharedKeySet = new Set<string>(SHARED_KEYS);

const cache: Record<string, string> = {};
let unsubscribeSnapshot: Unsubscribe | null = null;
let started = false;

function isShared(key: string): boolean {
  if (sharedKeySet.has(key)) return true;
  return SHARED_PREFIXES.some((p) => key.startsWith(p));
}

function emitChange(key: string) {
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  } catch {
    /* no-op */
  }
}

function applySnapshotValue(key: string, raw: unknown) {
  if (raw === undefined || raw === null) return;
  if (!isShared(key)) return;
  let next: string;
  if (typeof raw === "string") {
    // Already serialised — keep as is so we don't double-encode.
    try {
      // Validate that it parses; if not, wrap.
      JSON.parse(raw);
      next = raw;
    } catch {
      next = JSON.stringify(raw);
    }
  } else {
    next = JSON.stringify(raw);
  }
  if (cache[key] !== next) {
    cache[key] = next;
    try {
      localStorage.setItem(key, next);
    } catch {
      /* quota — ignore */
    }
    emitChange(key);
    emitChange("*");
  }
}

function pushKey(key: string, value: string): void {
  let payload: unknown;
  try {
    payload = JSON.parse(value);
  } catch {
    return;
  }
  void setDoc(
    doc(firestore(), KV_COLLECTION, key),
    { value: payload, updatedAt: Date.now() },
    { merge: true },
  ).catch(() => {
    /* fire and forget — local cache stays as is */
  });
}

export function getRaw(key: string): string | null {
  if (isShared(key)) {
    if (cache[key] !== undefined) return cache[key];
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw !== null) cache[key] = raw;
      return raw;
    }
    return null;
  }
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
}

export function setRaw(key: string, value: string): void {
  if (isShared(key)) {
    cache[key] = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    emitChange(key);
    pushKey(key, value);
    return;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
  }
}

export function removeRaw(key: string): void {
  if (isShared(key)) {
    cache[key] = "[]";
    try {
      localStorage.setItem(key, "[]");
    } catch {
      /* ignore */
    }
    emitChange(key);
    pushKey(key, "[]");
    return;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
  }
}

export function subscribeCloud(cb: (key?: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ key: string }>).detail;
    cb(detail?.key);
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export function startCloudKv(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  // Eagerly hydrate from localStorage so first reads return whatever the
  // device already knew (avoids UI flicker before the snapshot lands).
  for (const key of SHARED_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) cache[key] = raw;
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (SHARED_PREFIXES.some((p) => key.startsWith(p))) {
        const raw = localStorage.getItem(key);
        if (raw !== null) cache[key] = raw;
      }
    }
  } catch {
    /* localStorage iteration may fail in some environments */
  }

  // Subscribe to the entire kv collection so all shared keys (including
  // the dynamic per-vendor ones) stream in real time without polling.
  try {
    unsubscribeSnapshot = onSnapshot(
      collection(firestore(), KV_COLLECTION),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "removed") return;
          const data = change.doc.data() as { value?: unknown };
          applySnapshotValue(change.doc.id, data.value);
        });
      },
      (_err) => {
        /* network error — silently keep using last cache */
      },
    );
  } catch {
    /* firestore init failed — keep going with localStorage-only cache */
  }
}

export function stopCloudKv(): void {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  started = false;
}

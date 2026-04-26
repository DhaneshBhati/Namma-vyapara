/**
 * Verified Purchase Rating System (localStorage backend).
 *
 * Vendors generate one-time 4-digit codes; customers enter the code to unlock
 * a rating form. Stops fake reviews by requiring proof of purchase.
 */

import { getRaw, setRaw, subscribeCloud } from "./cloudKv";

const CODES_KEY = "namma_vendor_codes";
const RATINGS_KEY = "namma_ratings";
const SESSION_FP_KEY = "namma_session_fp";

const CODE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DAILY_LIMIT = 50;

export interface PurchaseCode {
  code: string;
  vendorId: string;
  generatedAt: number;
  expiresAt: number;
  used: boolean;
  usedBySession?: string;
}

export interface VendorRatingRecord {
  id: string;
  vendorId: string;
  quality: number; // 1..5
  freshness: number; // 1..5 (5 = thumbs up, 1 = thumbs down)
  comment?: string;
  timestamp: number;
  verifiedPurchase: true;
  sessionId: string;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  code?: PurchaseCode;
}

/* -------------------- session fingerprint -------------------- */

export function getSessionFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  let fp = localStorage.getItem(SESSION_FP_KEY);
  if (!fp) {
    fp = `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(SESSION_FP_KEY, fp);
  }
  return fp;
}

/* -------------------- codes -------------------- */

function readCodes(): PurchaseCode[] {
  try {
    const raw = getRaw(CODES_KEY);
    return raw ? (JSON.parse(raw) as PurchaseCode[]) : [];
  } catch {
    return [];
  }
}

function writeCodes(list: PurchaseCode[]) {
  setRaw(CODES_KEY, JSON.stringify(list));
}

export function getCodes(): PurchaseCode[] {
  return readCodes();
}

export function getCodesForVendor(vendorId: string): PurchaseCode[] {
  return readCodes()
    .filter((c) => c.vendorId === vendorId)
    .sort((a, b) => b.generatedAt - a.generatedAt);
}

export function activeCodeForVendor(vendorId: string): PurchaseCode | null {
  const now = Date.now();
  return (
    readCodes().find(
      (c) => c.vendorId === vendorId && !c.used && c.expiresAt > now,
    ) ?? null
  );
}

export function codesUsedToday(vendorId: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return readCodes().filter(
    (c) => c.vendorId === vendorId && c.generatedAt >= startMs,
  ).length;
}

export function dailyLimit(): number {
  return DAILY_LIMIT;
}

export function generateCodeForVendor(vendorId: string): {
  ok: boolean;
  reason?: string;
  code?: PurchaseCode;
} {
  const used = codesUsedToday(vendorId);
  if (used >= DAILY_LIMIT) {
    return {
      ok: false,
      reason: `Daily limit reached (${DAILY_LIMIT}/day). Resets at midnight.`,
    };
  }

  // Mark any prior unused-but-active code as expired so vendor only has one
  // active code at a time (avoids confusion).
  const list = readCodes();
  const now = Date.now();
  for (const c of list) {
    if (c.vendorId === vendorId && !c.used && c.expiresAt > now) {
      c.expiresAt = now;
    }
  }

  // Generate 4-digit code, retry on collision (vs. another vendor's active).
  let codeStr = "";
  for (let attempt = 0; attempt < 12; attempt++) {
    codeStr = String(Math.floor(1000 + Math.random() * 9000));
    const collision = list.some(
      (c) => c.code === codeStr && !c.used && c.expiresAt > now,
    );
    if (!collision) break;
  }

  const newCode: PurchaseCode = {
    code: codeStr,
    vendorId,
    generatedAt: now,
    expiresAt: now + CODE_TTL_MS,
    used: false,
  };
  list.push(newCode);
  writeCodes(list);
  return { ok: true, code: newCode };
}

/**
 * Seed a permanent demo code (e.g., 1234) for a specific vendor — for
 * demonstration so reviewers can immediately exercise the flow.
 */
export function seedDemoCode(vendorId: string, code: string) {
  const list = readCodes();
  const exists = list.some(
    (c) =>
      c.vendorId === vendorId &&
      c.code === code &&
      !c.used &&
      c.expiresAt > Date.now(),
  );
  if (exists) return;
  // Long expiry so demo doesn't lapse during testing.
  const now = Date.now();
  list.push({
    code,
    vendorId,
    generatedAt: now,
    expiresAt: now + 365 * 24 * 60 * 60 * 1000,
    used: false,
  });
  writeCodes(list);
}

export function verifyCode(code: string, vendorId: string): VerifyResult {
  const list = readCodes();
  const found = list.find((c) => c.code === code);
  if (!found) return { ok: false, reason: "Invalid code" };
  if (found.vendorId !== vendorId)
    return { ok: false, reason: "Code is for a different vendor" };
  if (found.used) return { ok: false, reason: "This code has already been used" };
  if (found.expiresAt <= Date.now())
    return { ok: false, reason: "This code has expired" };
  return { ok: true, code: found };
}

export function markCodeUsed(code: string, sessionId: string) {
  const list = readCodes();
  const found = list.find((c) => c.code === code);
  if (!found) return;
  found.used = true;
  found.usedBySession = sessionId;
  writeCodes(list);
}

/* -------------------- ratings -------------------- */

function readRatings(): VendorRatingRecord[] {
  try {
    const raw = getRaw(RATINGS_KEY);
    return raw ? (JSON.parse(raw) as VendorRatingRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRatings(list: VendorRatingRecord[]) {
  setRaw(RATINGS_KEY, JSON.stringify(list));
}

export function getRatingsForVendor(vendorId: string): VendorRatingRecord[] {
  return readRatings()
    .filter((r) => r.vendorId === vendorId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function addRating(input: {
  code: string;
  vendorId: string;
  quality: number;
  freshness: number;
  comment?: string;
}): { ok: boolean; reason?: string } {
  const verify = verifyCode(input.code, input.vendorId);
  if (!verify.ok) return { ok: false, reason: verify.reason };

  const sessionId = getSessionFingerprint();
  const rating: VendorRatingRecord = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    vendorId: input.vendorId,
    quality: input.quality,
    freshness: input.freshness,
    comment: input.comment?.trim() || undefined,
    timestamp: Date.now(),
    verifiedPurchase: true,
    sessionId,
  };
  const list = readRatings();
  list.push(rating);
  writeRatings(list);
  markCodeUsed(input.code, sessionId);
  return { ok: true };
}

/** Combined verified rating for a vendor — null if no verified ratings yet. */
export function verifiedRatingFor(vendorId: string): {
  qualityAvg: number;
  freshnessAvg: number;
  count: number;
} | null {
  const list = getRatingsForVendor(vendorId);
  if (list.length === 0) return null;
  const sumQ = list.reduce((a, r) => a + r.quality, 0);
  const sumF = list.reduce((a, r) => a + r.freshness, 0);
  return {
    qualityAvg: +(sumQ / list.length).toFixed(2),
    freshnessAvg: +(sumF / list.length).toFixed(2),
    count: list.length,
  };
}

/**
 * Subscribe to changes in codes/ratings — fired on storage events from other
 * tabs and on a tick interval (so the vendor's countdown stays accurate).
 */
export function subscribeRatings(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === CODES_KEY || e.key === RATINGS_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  const unsubCloud = subscribeCloud((key) => {
    if (!key || key === CODES_KEY || key === RATINGS_KEY) cb();
  });
  return () => {
    window.removeEventListener("storage", onStorage);
    unsubCloud();
  };
}

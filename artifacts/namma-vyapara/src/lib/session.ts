import type { PushcartSubcategory } from "./vendors";
import { getRaw, setRaw } from "./cloudKv";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { firebaseAuth, phoneToEmail } from "./firebase";

export type Role = "customer" | "vendor" | "guest";

export interface Session {
  role: Role;
  name: string;
  phone?: string;
  vendorType?: "Pushcart" | "Local Shop";
  vendorSubcategory?: PushcartSubcategory;
  loggedInAt: number;
}

export interface CustomerRecord {
  name: string;
  phone: string;
  /** Kept for backward compatibility with the local cache; auth is via Firebase. */
  password: string;
}

export interface VendorRecord {
  vendorType: "Pushcart" | "Local Shop";
  subcategory?: PushcartSubcategory;
  name: string;
  phone: string;
  altPhone?: string;
  lat?: number;
  lng?: number;
  description: string;
  /** Kept for backward compatibility with the local cache; auth is via Firebase. */
  password: string;
}

export interface RecentVendor {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  distanceKm: number;
  viewedAt: number;
}

export interface NotifySettings {
  enabled: boolean;
  rangeKm: number;
  subcategories: PushcartSubcategory[];
}

export interface FreshnessItem {
  id: string;
  name: string;
  qty: string;
  purchasedAt: string; // ISO date
}

const SESSION_KEY = "namma_vyapara_session";
const CUSTOMERS_KEY = "namma_vyapara_customers";
const VENDORS_KEY = "namma_vyapara_vendors";

const RECENT_KEY = (phone: string) => `nv_recent_${phone}`;
const FAV_KEY = (phone: string) => `nv_fav_${phone}`;
const NOTIFY_KEY = (phone: string) => `nv_notify_${phone}`;
const ORDERS_KEY = (phone: string) => `nv_orders_${phone}`;
const VENDOR_ORDERS_KEY = (phone: string) => `nv_vendor_orders_${phone}`;
const FRESH_KEY = (phone: string) => `nv_fresh_${phone}`;
const VENDOR_WATCH_KEY = (phone: string) => `nv_vwatch_${phone}`;

/* --------------- session --------------- */

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* --------------- generic list helpers --------------- */

function readList<T>(key: string): T[] {
  try {
    const raw = getRaw(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]) {
  setRaw(key, JSON.stringify(items));
}

/* --------------- customers --------------- */

export function getCustomers(): CustomerRecord[] {
  return readList<CustomerRecord>(CUSTOMERS_KEY);
}

function upsertCustomerLocal(c: CustomerRecord) {
  const list = getCustomers().filter((x) => x.phone !== c.phone);
  list.push(c);
  writeList(CUSTOMERS_KEY, list);
}

/** Create a Firebase Auth account + Firestore profile for a new customer. */
export async function addCustomer(c: CustomerRecord): Promise<void> {
  await createUserWithEmailAndPassword(
    firebaseAuth(),
    phoneToEmail(c.phone),
    c.password,
  );
  // Mirror the profile to the shared kv cache (no password stored).
  upsertCustomerLocal({ ...c, password: "" });
}

/** Sign in an existing customer with phone + password via Firebase Auth. */
export async function findCustomer(
  phone: string,
  password: string,
): Promise<CustomerRecord | null> {
  await signInWithEmailAndPassword(
    firebaseAuth(),
    phoneToEmail(phone),
    password,
  );
  // After sign-in, look up the profile from the cached customer list.
  const existing = getCustomerByPhone(phone);
  if (existing) return existing;
  // First sign-in on a fresh device — bootstrap a minimal profile so the UI
  // has something to display. The user can edit it from settings later.
  const fallback: CustomerRecord = {
    name: "Bengaluru Friend",
    phone,
    password: "",
  };
  upsertCustomerLocal(fallback);
  return fallback;
}

export function getCustomerByPhone(phone: string): CustomerRecord | null {
  return getCustomers().find((c) => c.phone === phone) ?? null;
}

/* --------------- vendors --------------- */

export function getVendors(): VendorRecord[] {
  return readList<VendorRecord>(VENDORS_KEY);
}

function upsertVendorLocal(v: VendorRecord) {
  const list = getVendors().filter((x) => x.phone !== v.phone);
  list.push(v);
  writeList(VENDORS_KEY, list);
}

export async function addVendor(v: VendorRecord): Promise<void> {
  await createUserWithEmailAndPassword(
    firebaseAuth(),
    phoneToEmail(v.phone),
    v.password,
  );
  upsertVendorLocal({ ...v, password: "" });
}

export async function findVendor(
  phone: string,
  password: string,
): Promise<VendorRecord | null> {
  await signInWithEmailAndPassword(
    firebaseAuth(),
    phoneToEmail(phone),
    password,
  );
  const existing = getVendorByPhone(phone);
  if (existing) return existing;
  const fallback: VendorRecord = {
    vendorType: "Pushcart",
    name: "Pushcart Vendor",
    phone,
    description: "",
    password: "",
  };
  upsertVendorLocal(fallback);
  return fallback;
}

export function getVendorByPhone(phone: string): VendorRecord | null {
  return getVendors().find((v) => v.phone === phone) ?? null;
}

/* --------------- sign out --------------- */

export async function firebaseSignOutSafe(): Promise<void> {
  try {
    await firebaseSignOut(firebaseAuth());
  } catch {
    /* ignore */
  }
}

export function currentFirebaseUser(): User | null {
  try {
    return firebaseAuth().currentUser;
  } catch {
    return null;
  }
}

/* --------------- recent views --------------- */

export function getRecentVendors(phone: string): RecentVendor[] {
  return readList<RecentVendor>(RECENT_KEY(phone));
}

export function pushRecentVendor(phone: string, v: RecentVendor) {
  const list = getRecentVendors(phone).filter((r) => r.id !== v.id);
  list.unshift(v);
  writeList(RECENT_KEY(phone), list.slice(0, 8));
}

export function clearRecentVendors(phone: string) {
  writeList(RECENT_KEY(phone), []);
}

/* --------------- favorites --------------- */

export function getFavorites(phone: string): string[] {
  return readList<string>(FAV_KEY(phone));
}

export function toggleFavorite(phone: string, id: string): boolean {
  const set = new Set(getFavorites(phone));
  let isFav: boolean;
  if (set.has(id)) {
    set.delete(id);
    isFav = false;
  } else {
    set.add(id);
    isFav = true;
  }
  writeList(FAV_KEY(phone), Array.from(set));
  return isFav;
}

/* --------------- notify settings --------------- */

const DEFAULT_NOTIFY: NotifySettings = {
  enabled: false,
  rangeKm: 1,
  subcategories: ["Fruits", "Vegetables"],
};

export function getNotifySettings(phone: string): NotifySettings {
  try {
    const raw = localStorage.getItem(NOTIFY_KEY(phone));
    if (!raw) return DEFAULT_NOTIFY;
    return { ...DEFAULT_NOTIFY, ...(JSON.parse(raw) as NotifySettings) };
  } catch {
    return DEFAULT_NOTIFY;
  }
}

export function setNotifySettings(phone: string, n: NotifySettings) {
  localStorage.setItem(NOTIFY_KEY(phone), JSON.stringify(n));
}

/* --------------- mock orders --------------- */

export interface OrderRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  item: string;
  amount: number;
  placedAt: number;
}

export function getOrders(phone: string): OrderRecord[] {
  return readList<OrderRecord>(ORDERS_KEY(phone));
}

export function addOrder(phone: string, o: OrderRecord) {
  const list = getOrders(phone);
  list.unshift(o);
  writeList(ORDERS_KEY(phone), list.slice(0, 30));
}

/* --------------- vendor-side incoming orders --------------- */

export interface VendorOrderRecord {
  id: string;
  customerPhone: string;
  customerName: string;
  item: string;
  amount: number;
  placedAt: number;
  status: "pending" | "accepted" | "declined";
}

export function getVendorOrders(vendorPhone: string): VendorOrderRecord[] {
  return readList<VendorOrderRecord>(VENDOR_ORDERS_KEY(vendorPhone));
}

export function addVendorOrder(vendorPhone: string, o: VendorOrderRecord) {
  const list = getVendorOrders(vendorPhone);
  if (list.some((x) => x.id === o.id)) return;
  list.unshift(o);
  writeList(VENDOR_ORDERS_KEY(vendorPhone), list.slice(0, 50));
}

export function setVendorOrderStatus(
  vendorPhone: string,
  id: string,
  status: VendorOrderRecord["status"],
) {
  const list = getVendorOrders(vendorPhone);
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx]!, status };
  writeList(VENDOR_ORDERS_KEY(vendorPhone), list);
}

/* --------------- vendor freshness items --------------- */

export function getFreshnessItems(vendorPhone: string): FreshnessItem[] {
  return readList<FreshnessItem>(FRESH_KEY(vendorPhone));
}

export function setFreshnessItems(vendorPhone: string, items: FreshnessItem[]) {
  writeList(FRESH_KEY(vendorPhone), items);
}

/* --------------- profile updates (customers + vendors) --------------- */

export function updateCustomer(
  phone: string,
  patch: Partial<Pick<CustomerRecord, "name">>,
): CustomerRecord | null {
  const list = getCustomers();
  const idx = list.findIndex((c) => c.phone === phone);
  const existing = idx >= 0 ? list[idx]! : { name: "", phone, password: "" };
  const updated: CustomerRecord = { ...existing, ...patch };
  upsertCustomerLocal(updated);
  // keep session in sync
  const s = getSession();
  if (s && s.phone === phone && patch.name) {
    setSession({ ...s, name: patch.name });
  }
  return updated;
}

export async function changeCustomerPassword(
  phone: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
  return changeFirebasePassword(phone, currentPassword, newPassword);
}

export function updateVendor(
  phone: string,
  patch: Partial<
    Pick<VendorRecord, "name" | "altPhone" | "description" | "lat" | "lng">
  >,
): VendorRecord | null {
  const list = getVendors();
  const idx = list.findIndex((v) => v.phone === phone);
  const existing =
    idx >= 0
      ? list[idx]!
      : ({
          vendorType: "Pushcart",
          name: "",
          phone,
          description: "",
          password: "",
        } as VendorRecord);
  const updated: VendorRecord = { ...existing, ...patch };
  upsertVendorLocal(updated);
  const s = getSession();
  if (s && s.phone === phone && patch.name) {
    setSession({ ...s, name: patch.name });
  }
  return updated;
}

export async function changeVendorPassword(
  phone: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
  return changeFirebasePassword(phone, currentPassword, newPassword);
}

async function changeFirebasePassword(
  phone: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (newPassword.length < 4)
    return { ok: false, reason: "Password must be at least 4 characters" };
  const auth = firebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.email)
    return { ok: false, reason: "You must be signed in" };
  try {
    const cred = EmailAuthProvider.credential(
      phoneToEmail(phone),
      currentPassword,
    );
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (code.includes("wrong-password") || code.includes("invalid-credential"))
      return { ok: false, reason: "Current password is incorrect" };
    if (code.includes("weak-password"))
      return { ok: false, reason: "Password must be at least 6 characters" };
    return { ok: false, reason: "Could not change password" };
  }
}

/* --------------- per-vendor "notify me" watches --------------- */

export interface VendorWatch {
  vendorId: string;
  vendorName: string;
  rangeKm: number;
  createdAt: number;
}

export function getVendorWatches(phone: string): VendorWatch[] {
  return readList<VendorWatch>(VENDOR_WATCH_KEY(phone));
}

export function getVendorWatch(
  phone: string,
  vendorId: string,
): VendorWatch | null {
  return getVendorWatches(phone).find((w) => w.vendorId === vendorId) ?? null;
}

export function setVendorWatch(phone: string, w: VendorWatch) {
  const list = getVendorWatches(phone).filter((x) => x.vendorId !== w.vendorId);
  list.push(w);
  writeList(VENDOR_WATCH_KEY(phone), list);
}

export function removeVendorWatch(phone: string, vendorId: string) {
  const list = getVendorWatches(phone).filter((x) => x.vendorId !== vendorId);
  writeList(VENDOR_WATCH_KEY(phone), list);
}

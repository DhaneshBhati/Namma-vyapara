export type VendorCategory =
  | "Pushcart"
  | "Restaurant"
  | "Grocery"
  | "Flowers"
  | "Tender Coconut"
  | "Tea Stall"
  | "Tiffin";

export type PushcartSubcategory =
  | "Fruits"
  | "Vegetables"
  | "Snacks"
  | "Juice"
  | "Sweets";

export const PUSHCART_SUBCATEGORIES: PushcartSubcategory[] = [
  "Fruits",
  "Vegetables",
  "Snacks",
  "Juice",
  "Sweets",
];

export interface VendorItem {
  name: string;
  price: number; // rupees
  unit: string; // "kg" | "piece" | "ltr" | "plate"
  freshDays?: number; // 0 = today (fruits/veg)
}

export interface VendorRating {
  qualityAvg: number; // 1-5
  freshnessAvg: number; // 1-5
  count: number;
}

export interface Vendor {
  id: string;
  name: string;
  owner: string;
  category: VendorCategory;
  subcategory?: PushcartSubcategory;
  lat: number;
  lng: number;
  distanceKm: number;
  hype: number;
  openNow: boolean;
  phone: string;
  tagline: string;
  /**
   * For fruit/vegetable pushcarts only — how many days ago the vendor stocked
   * their goods. 0 means today.
   */
  stockedDaysAgo?: number;
  /** Items sold with prices. */
  items: VendorItem[];
  /** Seeded rating (overridden by verified ratings if any exist). */
  rating: VendorRating;
  /** Estimated time of arrival in minutes — only for moving pushcarts. */
  etaMinutes?: number;
}

const NAME_BY_CATEGORY: Record<Exclude<VendorCategory, "Pushcart">, string[]> = {
  Restaurant: [
    "Lakshmi Tiffin Room",
    "Sri Krishna Bhavan",
    "Namma Mess",
    "Rotti Ghar",
  ],
  Grocery: [
    "Bengaluru Provision Store",
    "Sapna Daily Needs",
    "MG Grocery Mart",
    "Kannada Kirana",
  ],
  Flowers: ["Lakshmi Flowers", "Mallige Hoovu Stall", "Sevanthi Pookadai"],
  "Tender Coconut": [
    "Bengaluru Tender Coconut",
    "Elaneer Express",
    "Karnataka Coconut Cart",
  ],
  "Tea Stall": ["Chai Point Pushcart", "Iyengar Tea Stall", "Bengaluru Bun Chai"],
  Tiffin: ["Priya Tiffin Center", "Amma Tiffin Box", "Idli Vada House"],
};

const PUSHCART_NAMES: Record<PushcartSubcategory, string[]> = {
  Fruits: [
    "Anil Fresh Fruits Cart",
    "Mango Mahesh",
    "Bengaluru Banana Bandi",
    "Sweet Lime Cart",
  ],
  Vegetables: [
    "Sapna Veggie Cart",
    "Daily Sabzi Bandi",
    "Shankar Vegetables",
    "Hasiru Tarakari",
  ],
  Snacks: [
    "Mahesh Chaat Corner",
    "Ravi Bhel Puri",
    "Pani Puri Pushcart",
    "Masala Mandakki Cart",
  ],
  Juice: [
    "Cool Cane Juice",
    "Suresh Cut Mango Cart",
    "Ganga Juice Stall",
    "Mosambi Express",
  ],
  Sweets: [
    "Mysore Pak Cart",
    "Jalebi Junction",
    "Holige Wala",
    "Karadantu Stall",
  ],
};

const TAGLINE_BY_SUBCAT: Record<PushcartSubcategory, string[]> = {
  Fruits: [
    "Picked from Hosur this dawn",
    "Sweet, ripe and ready",
    "From the orchard to your hand",
  ],
  Vegetables: [
    "Fresh from KR Market today",
    "Crisp greens, daily picks",
    "Today's haul from the farmer",
  ],
  Snacks: [
    "Crunchy. Spicy. Bengaluru.",
    "Hot bhel, hand-tossed",
    "Loved by techies in Whitefield",
  ],
  Juice: [
    "Pressed in front of you",
    "Iced and ready",
    "Mosambi season special",
  ],
  Sweets: [
    "Family recipe since 1992",
    "Soaked in real saffron",
    "Hand-rolled, not factory-made",
  ],
};

// Catalog of items per category/subcategory with realistic Bengaluru pricing.
const PUSHCART_ITEMS: Record<PushcartSubcategory, VendorItem[]> = {
  Fruits: [
    { name: "Banana (Yelakki)", price: 60, unit: "dozen" },
    { name: "Mango (Alphonso)", price: 280, unit: "kg" },
    { name: "Sweet Lime", price: 80, unit: "kg" },
    { name: "Pomegranate", price: 140, unit: "kg" },
    { name: "Watermelon", price: 35, unit: "kg" },
    { name: "Papaya", price: 50, unit: "kg" },
  ],
  Vegetables: [
    { name: "Tomato", price: 40, unit: "kg" },
    { name: "Onion", price: 35, unit: "kg" },
    { name: "Coriander", price: 10, unit: "bunch" },
    { name: "Green Chilli", price: 60, unit: "250g" },
    { name: "Brinjal", price: 50, unit: "kg" },
    { name: "Beans", price: 80, unit: "kg" },
  ],
  Snacks: [
    { name: "Pani Puri (12 pcs)", price: 40, unit: "plate" },
    { name: "Bhel Puri", price: 50, unit: "plate" },
    { name: "Masala Mandakki", price: 30, unit: "plate" },
    { name: "Onion Bonda (4 pcs)", price: 45, unit: "plate" },
  ],
  Juice: [
    { name: "Sugarcane Juice", price: 30, unit: "glass" },
    { name: "Mosambi Juice", price: 60, unit: "glass" },
    { name: "Cut Mango", price: 40, unit: "cup" },
    { name: "Tender Coconut", price: 40, unit: "piece" },
  ],
  Sweets: [
    { name: "Mysore Pak", price: 350, unit: "kg" },
    { name: "Jalebi", price: 220, unit: "kg" },
    { name: "Holige", price: 25, unit: "piece" },
    { name: "Karadantu", price: 480, unit: "kg" },
  ],
};

const ITEMS_BY_CATEGORY: Record<Exclude<VendorCategory, "Pushcart">, VendorItem[]> = {
  Restaurant: [
    { name: "Masala Dosa", price: 80, unit: "plate" },
    { name: "Idli Vada", price: 60, unit: "plate" },
    { name: "Filter Coffee", price: 30, unit: "cup" },
    { name: "Khara Bath", price: 50, unit: "plate" },
  ],
  Grocery: [
    { name: "Rice (Sona Masoori)", price: 70, unit: "kg" },
    { name: "Toor Dal", price: 140, unit: "kg" },
    { name: "Sugar", price: 45, unit: "kg" },
    { name: "Sunflower Oil", price: 160, unit: "ltr" },
  ],
  Flowers: [
    { name: "Jasmine Garland", price: 20, unit: "moora" },
    { name: "Marigold", price: 60, unit: "kg" },
    { name: "Rose", price: 10, unit: "stem" },
  ],
  "Tender Coconut": [
    { name: "Tender Coconut", price: 40, unit: "piece" },
    { name: "Coconut Water + Malai", price: 50, unit: "piece" },
  ],
  "Tea Stall": [
    { name: "Cutting Chai", price: 12, unit: "cup" },
    { name: "Bun + Chai", price: 30, unit: "set" },
    { name: "Biscuit", price: 5, unit: "piece" },
  ],
  Tiffin: [
    { name: "Idli (4 pcs)", price: 50, unit: "plate" },
    { name: "Vada (2 pcs)", price: 40, unit: "plate" },
    { name: "Pongal", price: 60, unit: "plate" },
  ],
};

const TAGLINES_GENERIC = [
  "Fresh from this morning",
  "Hot, hand-tossed, hand-served",
  "Family recipe since 1992",
  "100% kannadiga taste",
  "Locally sourced, locally loved",
  "Voted favourite on the street",
  "Open since sunrise",
];

const OWNERS = [
  "Mahesh",
  "Priya",
  "Anil",
  "Lakshmi",
  "Suresh",
  "Ravi",
  "Kavya",
  "Manjunath",
  "Geetha",
  "Shankar",
  "Pooja",
  "Vignesh",
];

const CATEGORIES: VendorCategory[] = [
  "Pushcart",
  "Pushcart", // weight Pushcart higher — primary use case
  "Pushcart",
  "Restaurant",
  "Grocery",
  "Flowers",
  "Tender Coconut",
  "Tea Stall",
  "Tiffin",
];

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateNearbyVendors(
  centerLat: number,
  centerLng: number,
  count = 18,
): Vendor[] {
  const seed = Math.round((centerLat + centerLng) * 10000) || 12345;
  const rand = seededRandom(seed);
  const vendors: Vendor[] = [];

  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)]!;

    let subcategory: PushcartSubcategory | undefined;
    let name: string;
    let tagline: string;

    if (category === "Pushcart") {
      subcategory =
        PUSHCART_SUBCATEGORIES[Math.floor(rand() * PUSHCART_SUBCATEGORIES.length)]!;
      const names = PUSHCART_NAMES[subcategory];
      name = names[Math.floor(rand() * names.length)]!;
      const tags = TAGLINE_BY_SUBCAT[subcategory];
      tagline = tags[Math.floor(rand() * tags.length)]!;
    } else {
      const names = NAME_BY_CATEGORY[category];
      name = names[Math.floor(rand() * names.length)]!;
      tagline = TAGLINES_GENERIC[Math.floor(rand() * TAGLINES_GENERIC.length)]!;
    }

    const owner = OWNERS[Math.floor(rand() * OWNERS.length)]!;

    const angle = rand() * Math.PI * 2;
    const radius = 0.002 + rand() * 0.013;
    const lat = centerLat + Math.cos(angle) * radius;
    const lng =
      centerLng + (Math.sin(angle) * radius) / Math.cos((centerLat * Math.PI) / 180);

    const distanceKm = haversineKm(centerLat, centerLng, lat, lng);
    const hype = Math.round(15 + rand() * 80);
    const openNow = rand() > 0.2;
    const phone = `+9198${Math.floor(10000000 + rand() * 89999999)}`;

    let stockedDaysAgo: number | undefined;
    if (subcategory === "Fruits" || subcategory === "Vegetables") {
      const r = rand();
      stockedDaysAgo = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
    }

    // Build a small catalog of 3-5 items per vendor.
    const baseItems =
      category === "Pushcart" && subcategory
        ? PUSHCART_ITEMS[subcategory]
        : ITEMS_BY_CATEGORY[category as Exclude<VendorCategory, "Pushcart">];
    const itemCount = 3 + Math.floor(rand() * 3);
    const shuffled = [...baseItems].sort(() => rand() - 0.5);
    const items: VendorItem[] = shuffled.slice(0, itemCount).map((it) => {
      // Slight ±10% price variation per vendor.
      const variance = 1 + (rand() * 0.2 - 0.1);
      return {
        ...it,
        price: Math.round(it.price * variance),
        freshDays:
          subcategory === "Fruits" || subcategory === "Vegetables"
            ? stockedDaysAgo
            : undefined,
      };
    });

    // Seeded star rating: 3.5 - 5.0 with a heavier bias towards 4-5 stars.
    const qualityAvg = +(3.5 + rand() * 1.5).toFixed(1);
    const freshnessAvg =
      subcategory === "Fruits" || subcategory === "Vegetables"
        ? +(stockedDaysAgo === 0 ? 4.5 + rand() * 0.5 : stockedDaysAgo === 1 ? 3.8 + rand() * 0.6 : 2.8 + rand() * 0.7).toFixed(1)
        : +(3.8 + rand() * 1.2).toFixed(1);
    const ratingCount = Math.floor(8 + rand() * 92);

    // ETA only for some pushcarts (those that move). Static stalls don't have one.
    const etaMinutes =
      category === "Pushcart" && rand() < 0.6
        ? Math.max(1, Math.round(distanceKm * (10 + rand() * 8)))
        : undefined;

    vendors.push({
      id: `v_${i}_${seed}`,
      name,
      owner,
      category,
      subcategory,
      lat,
      lng,
      distanceKm,
      hype,
      openNow,
      phone,
      tagline,
      stockedDaysAgo,
      items,
      rating: { qualityAvg, freshnessAvg, count: ratingCount },
      etaMinutes,
    });
  }

  return vendors.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Walking-pace ETA in minutes for any vendor based on distance. */
export function walkingEtaMinutes(distanceKm: number): number {
  // ~12 minutes per km walking pace
  return Math.max(1, Math.round(distanceKm * 12));
}

/** Icon hint string per category — UI maps to a lucide icon. */
export function categoryIconKey(
  category: VendorCategory,
  subcategory?: PushcartSubcategory,
): string {
  if (category === "Pushcart") {
    switch (subcategory) {
      case "Fruits":
        return "apple";
      case "Vegetables":
        return "carrot";
      case "Snacks":
        return "cookie";
      case "Juice":
        return "cup-soda";
      case "Sweets":
        return "candy";
      default:
        return "shopping-cart";
    }
  }
  switch (category) {
    case "Restaurant":
      return "utensils";
    case "Grocery":
      return "shopping-basket";
    case "Flowers":
      return "flower";
    case "Tender Coconut":
      return "leaf";
    case "Tea Stall":
      return "coffee";
    case "Tiffin":
      return "soup";
    default:
      return "store";
  }
}

export function freshnessLabel(days: number | undefined): {
  label: string;
  tone: "fresh" | "ok" | "old";
} | null {
  if (days === undefined) return null;
  if (days <= 0) return { label: "Stocked today", tone: "fresh" };
  if (days === 1) return { label: "1 day old", tone: "ok" };
  return { label: `${days} days old`, tone: "old" };
}

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };

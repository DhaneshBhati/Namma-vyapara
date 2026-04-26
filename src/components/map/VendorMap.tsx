import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import type { Vendor } from "@/lib/vendors";
import type { LiveLocation } from "@/lib/liveLocation";

interface VendorMapProps {
  center: { lat: number; lng: number };
  vendors: Vendor[];
  liveLocations?: LiveLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTrackLive?: (phone: string) => void;
  notifyRangeKm?: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  Pushcart: "hsl(4, 82%, 60%)",
  Restaurant: "hsl(38, 96%, 60%)",
  Grocery: "hsl(142, 64%, 52%)",
  Flowers: "hsl(322, 80%, 64%)",
  "Tender Coconut": "hsl(178, 86%, 48%)",
  "Tea Stall": "hsl(28, 80%, 56%)",
  Tiffin: "hsl(264, 76%, 70%)",
};

function makeVendorIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div class="vendor-pin" style="background:${color}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeLiveIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `<div class="live-pin"><div class="live-pin-core">${label}</div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<div class="user-pin"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FlyController({
  center,
  selected,
}: {
  center: { lat: number; lng: number };
  selected: Vendor | null;
}) {
  const map = useMap();
  const lastSelectedId = useRef<string | null>(null);

  useEffect(() => {
    map.flyTo([center.lat, center.lng], 15, { duration: 0.8 });
  }, [center.lat, center.lng, map]);

  useEffect(() => {
    if (selected && selected.id !== lastSelectedId.current) {
      lastSelectedId.current = selected.id;
      map.flyTo([selected.lat, selected.lng], 16, { duration: 0.8 });
    }
  }, [selected, map]);

  return null;
}

export function VendorMap({
  center,
  vendors,
  liveLocations = [],
  selectedId,
  onSelect,
  onTrackLive,
  notifyRangeKm,
}: VendorMapProps) {
  const selected = useMemo(
    () => vendors.find((v) => v.id === selectedId) ?? null,
    [vendors, selectedId],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      scrollWheelZoom
      className="h-full w-full rounded-xl overflow-hidden"
      style={{ minHeight: 380 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[center.lat, center.lng]} icon={userIcon}>
        <Popup>
          <div className="text-sm font-medium">You are here</div>
          <div className="text-xs text-muted-foreground">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </div>
        </Popup>
      </Marker>

      {notifyRangeKm && notifyRangeKm > 0 && (
        <Circle
          center={[center.lat, center.lng]}
          radius={notifyRangeKm * 1000}
          pathOptions={{
            color: "hsl(4, 82%, 60%)",
            weight: 1,
            fillOpacity: 0.05,
            dashArray: "4 6",
          }}
        />
      )}

      {vendors.map((v) => {
        const color = CATEGORY_COLOR[v.category] ?? "hsl(4, 82%, 60%)";
        const label = v.name
          .split(" ")
          .filter(Boolean)
          .slice(0, 1)
          .map((w) => w[0])
          .join("")
          .toUpperCase();
        return (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={makeVendorIcon(label, color)}
            eventHandlers={{ click: () => onSelect(v.id) }}
          >
            <Popup>
              <div className="space-y-1.5 min-w-[200px]">
                <div className="font-semibold text-sm">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  {v.category} · {v.distanceKm.toFixed(2)} km
                </div>
                <div className="text-xs">{v.tagline}</div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${v.phone}`}
                    className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
                  >
                    Call
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground"
                  >
                    Directions
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {liveLocations.map((live) => {
        const initial = live.vendorName?.[0]?.toUpperCase() ?? "L";
        return (
          <Marker
            key={`live_${live.phone}`}
            position={[live.lat, live.lng]}
            icon={makeLiveIcon(initial)}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="space-y-1.5 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    Live now
                  </span>
                </div>
                <div className="font-semibold text-sm">{live.vendorName}</div>
                {live.subcategory && (
                  <div className="text-xs text-muted-foreground">
                    Pushcart · {live.subcategory}
                  </div>
                )}
                <button
                  onClick={() => onTrackLive?.(live.phone)}
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
                >
                  Track this cart
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <FlyController center={center} selected={selected} />
    </MapContainer>
  );
}

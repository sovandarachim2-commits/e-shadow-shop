"use client";

import { useEffect, useRef, useState } from "react";

type AddressMapPreviewProps = {
  address?: string | null;
  province?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  title?: string;
  className?: string;
  interactive?: boolean;
  onCoordinateChange?: (latitude: number, longitude: number) => void;
};

declare global {
  interface Window {
    L?: any;
  }
}

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];
const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_SCRIPT_ID = "leaflet-script-cdn";
const MAP_STYLE_OPTIONS = ["map", "satellite"] as const;

type MapStyle = (typeof MAP_STYLE_OPTIONS)[number];

function toNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureLeafletAssets() {
  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  return new Promise<void>((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Leaflet")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(script);
  });
}

function createBaseLayer(style: MapStyle) {
  if (!window.L) return null;

  if (style === "satellite") {
    return window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri"
    });
  }

  return window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
  });
}

function createSatelliteLabelsLayer() {
  if (!window.L) return null;

  return window.L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Labels &copy; Esri"
  });
}

function createBlueDotIcon() {
  if (!window.L) return null;

  return window.L.divIcon({
    className: "address-map-dot",
    html: `
      <div style="position:relative;width:28px;height:28px;">
        <div style="position:absolute;left:50%;top:50%;width:14px;height:14px;background:#2f62ff;border:4px solid #fff;border-radius:999px;transform:translate(-50%,-50%);box-shadow:0 6px 14px rgba(47,98,255,.28);"></div>
        <div style="position:absolute;left:50%;top:68%;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:36px solid rgba(47,98,255,.18);transform:translateX(-50%) rotate(16deg);filter:blur(0.3px);"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

export function AddressMapPreview({
  address,
  province,
  latitude,
  longitude,
  title = "Address map preview",
  className = "",
  interactive = false,
  onCoordinateChange
}: AddressMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const activeBaseLayerRef = useRef<any>(null);
  const satelliteLabelLayerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(interactive);
  const [leafletLoadFailed, setLeafletLoadFailed] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("map");
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);
  const query = [address, province].filter(Boolean).join(", ").trim();
  const hasCoordinates = lat !== null && lng !== null;
  const markerIcon = leafletReady && interactive ? createBlueDotIcon() : null;

  useEffect(() => {
    if (!interactive) return;

    let cancelled = false;
    ensureLeafletAssets()
      .then(() => {
        if (!cancelled) {
          setLeafletReady(true);
          setLeafletLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLeafletReady(false);
          setLeafletLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [interactive]);

  useEffect(() => {
    if (!interactive || !leafletReady || !mapRef.current || leafletMapRef.current) return;

    const map = window.L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true
    });

    map.attributionControl?.setPrefix(false);

    activeBaseLayerRef.current = createBaseLayer("map");
    activeBaseLayerRef.current?.addTo(map);

    leafletMapRef.current = map;

    const syncMapSize = () => {
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    syncMapSize();
    const timeoutId = window.setTimeout(syncMapSize, 180);

    map.on("click", (event: any) => {
      const nextLat = event.latlng.lat;
      const nextLng = event.latlng.lng;

      if (!markerRef.current) {
        markerRef.current = window.L.marker([nextLat, nextLng], markerIcon ? { icon: markerIcon } : undefined).addTo(map);
      } else {
        markerRef.current.setLatLng([nextLat, nextLng]);
      }

      onCoordinateChange?.(nextLat, nextLng);
    });

    return () => {
      window.clearTimeout(timeoutId);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
        activeBaseLayerRef.current = null;
        satelliteLabelLayerRef.current = null;
      }
    };
  }, [interactive, leafletReady, onCoordinateChange, markerIcon]);

  useEffect(() => {
    if (!interactive || !leafletReady || !leafletMapRef.current) return;

    const map = leafletMapRef.current;
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    if (activeBaseLayerRef.current) {
      map.removeLayer(activeBaseLayerRef.current);
    }

    if (satelliteLabelLayerRef.current) {
      map.removeLayer(satelliteLabelLayerRef.current);
      satelliteLabelLayerRef.current = null;
    }

    activeBaseLayerRef.current = createBaseLayer(mapStyle);
    activeBaseLayerRef.current?.addTo(map);

    if (mapStyle === "satellite") {
      satelliteLabelLayerRef.current = createSatelliteLabelsLayer();
      satelliteLabelLayerRef.current?.addTo(map);
    }

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [interactive, leafletReady, mapStyle]);

  useEffect(() => {
    if (!interactive || !leafletReady || !leafletMapRef.current) return;

    const map = leafletMapRef.current;

    if (hasCoordinates) {
      const nextCenter: [number, number] = [lat, lng];
      map.setView(nextCenter, 16);
      if (!markerRef.current) {
        markerRef.current = window.L.marker(nextCenter, markerIcon ? { icon: markerIcon } : undefined).addTo(map);
      } else {
        markerRef.current.setLatLng(nextCenter);
      }
      setLoadingCurrentLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      map.setView(DEFAULT_CENTER, 13);
      setLoadingCurrentLocation(false);
      return;
    }

    setLoadingCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
        map.setView(nextCenter, 16);
        if (!markerRef.current) {
          markerRef.current = window.L.marker(nextCenter, markerIcon ? { icon: markerIcon } : undefined).addTo(map);
        } else {
          markerRef.current.setLatLng(nextCenter);
        }
        onCoordinateChange?.(nextCenter[0], nextCenter[1]);
        setLoadingCurrentLocation(false);
      },
      () => {
        map.setView(DEFAULT_CENTER, 13);
        setLoadingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [interactive, leafletReady, hasCoordinates, lat, lng, onCoordinateChange, markerIcon]);

  if (interactive) {
    return (
      <div className={`overflow-hidden rounded-[32px] border border-[#d8e0ea] bg-[#eef4fb] shadow-[0_20px_60px_rgba(8,43,76,0.08)] ${className}`}>
        <div className="relative">
          <div
            ref={mapRef}
            aria-label={title}
            className="h-[38vh] min-h-[260px] w-full bg-[#edf3f9] md:h-[420px]"
            style={{ height: "clamp(260px, 38vh, 420px)" }}
          />
          {!leafletReady && !leafletLoadFailed ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#edf3f9] text-center">
              <div className="rounded-[24px] bg-white/88 px-5 py-4 shadow-sm">
                <p className="text-sm font-black text-[#082b4c]">Loading map preview...</p>
                <p className="mt-1 text-xs font-bold text-[#697b91]">Preparing your location picker</p>
              </div>
            </div>
          ) : null}
          {leafletLoadFailed ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#edf3f9] px-6 text-center">
              <div className="rounded-[24px] bg-white/92 px-5 py-4 shadow-sm">
                <p className="text-sm font-black text-[#082b4c]">Map preview could not load</p>
                <p className="mt-1 text-xs font-bold text-[#697b91]">Use current location or try reopening this card.</p>
              </div>
            </div>
          ) : null}
          <div className="absolute right-4 top-4 z-[500] flex rounded-full bg-white/92 p-1 shadow-[0_10px_20px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur-sm">
            {MAP_STYLE_OPTIONS.map((option) => {
              const active = mapStyle === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMapStyle(option)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] transition ${
                    active ? "bg-[#082b4c] text-white" : "text-[#5f6f84] hover:bg-[#f5f7fb]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#d8e0ea] bg-white px-4 py-3 text-xs font-bold text-[#697b91]">
          <span>{loadingCurrentLocation ? "Opening map on your current location..." : "Tap on the map to place or update your delivery pin."}</span>
          <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-[#4f6277]">{query || "Current location"}</span>
        </div>
      </div>
    );
  }

  if (!query && !hasCoordinates) {
    return (
      <div className={`grid min-h-44 place-items-center rounded-[28px] bg-[#fff8f3] px-6 text-center text-sm text-[#697b91] ${className}`}>
        Enter an address to preview the map location.
      </div>
    );
  }

  const src = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=16&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;

  return (
    <div className={`overflow-hidden rounded-[32px] border border-[#d8e0ea] bg-[#eef4fb] shadow-[0_20px_60px_rgba(8,43,76,0.08)] ${className}`}>
      <iframe
        title={title}
        src={src}
        className="h-[220px] w-full border-0 md:h-[320px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

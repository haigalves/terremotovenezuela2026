"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import type { LatLngExpression } from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "@/components/LocaleProvider";
import { CARACAS, EPICENTER } from "@/lib/constants";
import type {
  CheckRequest,
  LayerVisibility,
  VerifiedSituation,
} from "@/lib/types";
import type { OfficialFeedItem } from "@/lib/official-types";

function createPinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<span role="img" aria-label="${label}" style="
      display:block;width:28px;height:28px;
      background:${color};border:3px solid #fff;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    "></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-VE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MapClickHandler({
  enabled,
  onSelect,
}: {
  enabled: boolean;
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPin({
  target,
}: {
  target: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const key = `${target.lat},${target.lng}`;
    if (prev.current === key) return;
    prev.current = key;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 12), {
      duration: 0.8,
    });
  }, [map, target]);

  return null;
}

export interface ReliefMapProps {
  requests: CheckRequest[];
  videos: VerifiedSituation[];
  officialEvents: OfficialFeedItem[];
  layers: LayerVisibility;
  pickMode: boolean;
  pickedLocation: { lat: number; lng: number } | null;
  flyToTarget: { lat: number; lng: number } | null;
  onPickLocation: (lat: number, lng: number) => void;
}

export default function ReliefMap({
  requests,
  videos,
  officialEvents,
  layers,
  pickMode,
  pickedLocation,
  flyToTarget,
  onPickLocation,
}: ReliefMapProps) {
  const { t, locale } = useTranslation();
  const mapLabelId = useId();
  const center: LatLngExpression = [10.35, -67.5];

  const requestIcon = useMemo(
    () => createPinIcon("#e6b800", t.legendRequest),
    [t.legendRequest],
  );
  const videoIcon = useMemo(
    () => createPinIcon("#1e4080", t.legendVideo),
    [t.legendVideo],
  );
  const officialIcon = useMemo(
    () => createPinIcon("#c41e3a", t.legendOfficial),
    [t.legendOfficial],
  );

  return (
    <div className="relative h-full min-h-[320px] w-full">
      <p id={mapLabelId} className="sr-only">
        {t.mapRegion}. {pickMode ? t.clickMapHint : ""}
      </p>
      <MapContainer
        center={center}
        zoom={8}
        className="h-full w-full"
        scrollWheelZoom
        aria-labelledby={mapLabelId}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToPin target={flyToTarget} />
        <MapClickHandler enabled={pickMode} onSelect={onPickLocation} />

        <CircleMarker
          center={[EPICENTER.lat, EPICENTER.lng]}
          radius={10}
          pathOptions={{ color: "#ffcc00", fillColor: "#cf142b", fillOpacity: 0.9 }}
        >
          <Popup>
            <strong>{t.epicenter}</strong>
            <br />
            {EPICENTER.label}
          </Popup>
        </CircleMarker>

        {layers.official &&
          officialEvents
            .filter((e) => e.lat != null && e.lng != null)
            .map((event) => (
              <Marker
                key={event.id}
                position={[event.lat!, event.lng!]}
                icon={officialIcon}
              >
                <Popup>
                  <div className="max-w-xs space-y-1 text-sm">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-xs font-bold uppercase text-red-700">
                      {event.source}
                      {event.magnitude != null && ` · M${event.magnitude.toFixed(1)}`}
                    </p>
                    {event.place && <p>{event.place}</p>}
                    {event.depthKm != null && (
                      <p className="text-xs text-gray-600">
                        Profundidad: {event.depthKm.toFixed(1)} km
                      </p>
                    )}
                    <p>
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                      >
                        {t.openSource}
                      </a>
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

        {layers.requests &&
          requests.map((req) => (
            <Marker
              key={req.id}
              position={[req.lat, req.lng]}
              icon={requestIcon}
            >
              <Popup>
                <div className="max-w-xs space-y-1 text-sm">
                  <p className="font-semibold">{req.person_name}</p>
                  <p>
                    <span className="font-medium">{t.lastSeenArea}:</span>{" "}
                    {req.last_seen_area}
                  </p>
                  {req.description && <p>{req.description}</p>}
                  <p>
                    <span className="font-medium">Estado:</span>{" "}
                    {t.status[req.status]}
                  </p>
                  <p>
                    <span className="font-medium">{t.contact}:</span>{" "}
                    {req.contact_info}
                  </p>
                  <p className="text-xs text-gray-600">
                    {t.posted}: {formatDate(req.created_at, locale)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {layers.videos &&
          videos.map((video) => (
            <Marker
              key={video.id}
              position={[video.lat, video.lng]}
              icon={videoIcon}
            >
              <Popup>
                <div className="max-w-xs space-y-1 text-sm">
                  <p className="font-semibold">{video.title}</p>
                  <p>{video.area_name}</p>
                  <p className="text-xs text-gray-600">
                    {t.situationTypes[video.situation_type]}
                  </p>
                  {video.description && <p>{video.description}</p>}
                  <p>
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline"
                    >
                      {t.watchVideo}
                    </a>
                  </p>
                  {video.source_url && (
                    <p>
                      <a
                        href={video.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                      >
                        {t.viewSource}
                      </a>
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    {t.posted}: {formatDate(video.created_at, locale)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {pickedLocation && (
          <CircleMarker
            center={[pickedLocation.lat, pickedLocation.lng]}
            radius={8}
            pathOptions={{
              color: "#15803d",
              fillColor: "#22c55e",
              fillOpacity: 0.9,
            }}
          />
        )}
      </MapContainer>

      {pickMode && (
        <div
          className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3"
          role="status"
          aria-live="polite"
        >
          <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--ve-blue)] shadow-md ring-1 ring-[var(--border)]">
            {t.clickMapHint}
          </span>
        </div>
      )}
    </div>
  );
}

// Export for quick nav buttons
export { EPICENTER, CARACAS };

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReliefMapLoader from "@/components/ReliefMapLoader";
import OfficialFeed from "@/components/OfficialFeed";
import SiteHeader from "@/components/SiteHeader";
import HowToModal from "@/components/HowToModal";
import { useTranslation } from "@/components/LocaleProvider";
import { CARACAS, EPICENTER } from "@/lib/constants";
import type { OfficialFeedItem } from "@/lib/official-types";
import type {
  CheckRequest,
  LayerVisibility,
  SituationType,
  VerifiedSituation,
} from "@/lib/types";

type FormMode = "request" | "video" | null;

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function HomePage() {
  const { t } = useTranslation();
  const [howToOpen, setHowToOpen] = useState(false);
  const [requests, setRequests] = useState<CheckRequest[]>([]);
  const [videos, setVideos] = useState<VerifiedSituation[]>([]);
  const [configured, setConfigured] = useState(true);
  const [layers, setLayers] = useState<LayerVisibility>({
    requests: true,
    videos: true,
    official: true,
  });
  const [officialEvents, setOfficialEvents] = useState<OfficialFeedItem[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [pickedLocation, setPickedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const panelRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);

  async function loadPins() {
    const [reqRes, vidRes] = await Promise.all([
      fetch("/api/requests"),
      fetch("/api/videos"),
    ]);
    const reqJson = await reqRes.json();
    const vidJson = await vidRes.json();
    return {
      requests: reqJson.data ?? [],
      videos: vidJson.data ?? [],
      configured: reqJson.configured !== false && vidJson.configured !== false,
    };
  }

  const loadOfficial = useCallback(async () => {
    try {
      const res = await fetch("/api/official-feed", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setOfficialEvents(json.items ?? []);
    } catch {
      setOfficialEvents([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await loadPins();
      setRequests(data.requests);
      setVideos(data.videos);
      setConfigured(data.configured);
    } catch {
      setMessage({ type: "error", text: t.errorGeneric });
    }
  }, [t.errorGeneric]);

  useEffect(() => {
    loadData();
    loadOfficial();
    const interval = setInterval(() => {
      loadData();
      loadOfficial();
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadData, loadOfficial]);

  useEffect(() => {
    if (!formMode) return;
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [formMode]);

  useEffect(() => {
    if (!formMode && !feedOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (formMode) closeForm();
        else setFeedOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formMode, feedOpen]);

  useEffect(() => {
    if (!howToOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setHowToOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [howToOpen]);

  useEffect(() => {
    if (!layersOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) {
        setLayersOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [layersOpen]);

  function openForm(mode: FormMode) {
    setFeedOpen(false);
    setPickedLocation(null);
    setMessage(null);
    setFormMode(mode);
  }

  function closeForm() {
    setFormMode(null);
    setPickedLocation(null);
  }

  async function handleRequestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pickedLocation) return;
    setSubmitting(true);
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      lat: pickedLocation.lat,
      lng: pickedLocation.lng,
      person_name: String(form.get("person_name") ?? ""),
      last_seen_area: String(form.get("last_seen_area") ?? ""),
      description: String(form.get("description") ?? ""),
      contact_info: String(form.get("contact_info") ?? ""),
    };

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: typeof json.error === "string" ? json.error : t.errorGeneric,
        });
        return;
      }
      setMessage({ type: "success", text: t.successRequest });
      closeForm();
      await loadData();
    } catch {
      setMessage({ type: "error", text: t.errorGeneric });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVideoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pickedLocation) return;
    setSubmitting(true);
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const videoUrl = String(form.get("video_url") ?? "").trim();
    if (!isValidUrl(videoUrl)) {
      setMessage({ type: "error", text: t.invalidUrl });
      setSubmitting(false);
      return;
    }

    const sourceUrl = String(form.get("source_url") ?? "").trim();
    if (sourceUrl && !isValidUrl(sourceUrl)) {
      setMessage({ type: "error", text: t.invalidUrl });
      setSubmitting(false);
      return;
    }

    const payload = {
      lat: pickedLocation.lat,
      lng: pickedLocation.lng,
      area_name: String(form.get("area_name") ?? ""),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      video_url: videoUrl,
      source_url: sourceUrl || null,
      situation_type: String(form.get("situation_type") ?? "damage") as SituationType,
    };

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: typeof json.error === "string" ? json.error : t.errorGeneric,
        });
        return;
      }
      setMessage({ type: "success", text: t.successVideo });
      closeForm();
      await loadData();
    } catch {
      setMessage({ type: "error", text: t.errorGeneric });
    } finally {
      setSubmitting(false);
    }
  }

  function focusOfficialEvent(item: OfficialFeedItem) {
    if (item.lat == null || item.lng == null) return;
    setFlyToTarget({ lat: item.lat, lng: item.lng });
    setFeedOpen(false);
  }

  const visibleOfficial = layers.official ? officialEvents : [];
  const visibleRequests = layers.requests ? requests : [];
  const visibleVideos = layers.videos ? videos : [];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-[var(--ve-blue-dark)] focus:shadow-lg"
      >
        {t.skipToContent}
      </a>

      <SiteHeader onOpenHowTo={() => setHowToOpen(true)} />
      <HowToModal open={howToOpen} onClose={() => setHowToOpen(false)} />

      {!configured && (
        <div
          className="border-b border-[var(--ve-yellow)] bg-[var(--ve-yellow-soft)] px-3 py-1.5 text-center text-xs text-[#8a6d00] sm:text-sm"
          role="alert"
        >
          {t.databaseNotConfigured}
        </div>
      )}

      {message && !formMode && (
        <div
          className={`border-b px-3 py-1.5 text-center text-xs sm:text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <main
        id="main-content"
        className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:h-[calc(100dvh-4rem)]"
      >
        {/* Map — first and full-height on mobile */}
        <section
          className="relative order-1 flex min-h-0 flex-1 flex-col lg:order-2"
          aria-label={t.mapView}
        >
          <div className="map-toolbar absolute left-2 right-2 top-2 z-[500] flex flex-wrap items-start justify-between gap-2 sm:left-3 sm:right-3 sm:top-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setFlyToTarget({ lat: EPICENTER.lat, lng: EPICENTER.lng })
                }
                className="rounded-lg border border-[var(--border)] bg-white/95 px-2.5 py-2 text-xs font-medium text-[var(--ve-blue)] shadow-sm backdrop-blur-sm active:scale-[0.98] sm:px-3"
              >
                {t.focusEpicenter}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFlyToTarget({ lat: CARACAS.lat, lng: CARACAS.lng })
                }
                className="rounded-lg border border-[var(--border)] bg-white/95 px-2.5 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm active:scale-[0.98] sm:px-3"
              >
                {t.focusCaracas}
              </button>
            </div>

            <div ref={layersRef} className="relative">
              <button
                type="button"
                onClick={() => setLayersOpen((o) => !o)}
                aria-expanded={layersOpen}
                aria-haspopup="true"
                className="rounded-lg border border-[var(--border)] bg-white/95 px-2.5 py-2 text-xs font-semibold text-[var(--ve-blue)] shadow-sm backdrop-blur-sm active:scale-[0.98] sm:px-3"
              >
                {t.layersButton}
              </button>
              {layersOpen && (
                <div
                  className="absolute right-0 top-full z-10 mt-1.5 w-56 rounded-xl border border-[var(--border)] bg-white p-3 text-sm shadow-lg"
                  role="group"
                  aria-label={t.legend}
                >
                  <p className="mb-2 text-xs font-semibold text-[var(--foreground-muted)]">
                    {t.legend}
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layers.official}
                        onChange={(e) =>
                          setLayers((l) => ({ ...l, official: e.target.checked }))
                        }
                        className="size-4"
                      />
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block size-2.5 rounded-full bg-[var(--ve-red)]"
                          aria-hidden
                        />
                        {t.legendOfficial}
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layers.requests}
                        onChange={(e) =>
                          setLayers((l) => ({ ...l, requests: e.target.checked }))
                        }
                        className="size-4"
                      />
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block size-2.5 rounded-full bg-[var(--ve-yellow)]"
                          aria-hidden
                        />
                        {t.legendRequest}
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layers.videos}
                        onChange={(e) =>
                          setLayers((l) => ({ ...l, videos: e.target.checked }))
                        }
                        className="size-4"
                      />
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block size-2.5 rounded-full bg-[var(--ve-blue)] ring-1 ring-[var(--border)]"
                          aria-hidden
                        />
                        {t.legendVideo}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="map-surface min-h-[calc(100dvh-5rem)] flex-1 pb-[4.5rem] lg:min-h-0 lg:pb-0">
            <ReliefMapLoader
              requests={visibleRequests}
              videos={visibleVideos}
              officialEvents={visibleOfficial}
              layers={layers}
              pickMode={Boolean(formMode)}
              pickedLocation={pickedLocation}
              flyToTarget={flyToTarget}
              onPickLocation={(lat, lng) => setPickedLocation({ lat, lng })}
            />
          </div>

          {/* Mobile: fixed report bar */}
          <div
            className={`mobile-action-bar fixed inset-x-0 bottom-0 z-[600] border-t border-[var(--border)] bg-white/95 px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden ${
              formMode ? "hidden" : ""
            }`}
            role="toolbar"
            aria-label={t.reportToolbar}
          >
            <div className="mx-auto flex max-w-lg gap-2">
              <button
                type="button"
                onClick={() => setFeedOpen(true)}
                className="flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white px-2 py-1.5 text-xs font-semibold text-[var(--ve-blue)] active:bg-[var(--ve-blue-soft)]"
              >
                <span aria-hidden className="text-base leading-none">
                  📡
                </span>
                {t.fabFeed}
              </button>
              <button
                type="button"
                onClick={() => openForm("video")}
                className="flex min-h-12 flex-[1.4] flex-col items-center justify-center rounded-xl bg-[var(--ve-blue)] px-2 py-1.5 text-xs font-bold text-white shadow-sm active:bg-[#163366]"
              >
                <span aria-hidden className="text-base leading-none">
                  🎥
                </span>
                {t.fabVideo}
              </button>
              <button
                type="button"
                onClick={() => openForm("request")}
                className="flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl bg-[var(--ve-red)] px-2 py-1.5 text-xs font-bold text-white shadow-sm active:bg-[#a81830]"
              >
                <span aria-hidden className="text-base leading-none">
                  🔍
                </span>
                {t.fabRequest}
              </button>
            </div>
          </div>

          {/* Desktop: report buttons on map */}
          <div className="absolute bottom-4 right-4 z-[500] hidden flex-col gap-2 lg:flex">
            <button
              type="button"
              onClick={() => openForm("video")}
              className="rounded-xl bg-[var(--ve-blue)] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#163366]"
            >
              {t.addVideo}
            </button>
            <button
              type="button"
              onClick={() => openForm("request")}
              className="rounded-xl bg-[var(--ve-red)] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#a81830]"
            >
              {t.addRequest}
            </button>
          </div>
        </section>

        {/* Official feed — side panel on desktop, bottom sheet on mobile */}
        <aside
          className={`feed-panel order-2 flex w-full flex-col border-[var(--border)] bg-white lg:order-1 lg:w-[340px] lg:shrink-0 lg:border-r ${
            feedOpen ? "fixed inset-0 z-[700] lg:relative lg:inset-auto lg:z-auto" : "hidden lg:flex"
          }`}
        >
          {feedOpen && (
            <div
              className="absolute inset-0 bg-black/40 lg:hidden"
              aria-hidden
              onClick={() => setFeedOpen(false)}
            />
          )}
          <div
            className={`relative flex min-h-0 flex-1 flex-col bg-white ${
              feedOpen
                ? "absolute inset-x-0 bottom-0 max-h-[75dvh] rounded-t-2xl shadow-2xl lg:relative lg:inset-auto lg:max-h-none lg:rounded-none lg:shadow-none"
                : ""
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 lg:hidden">
              <h2 className="text-sm font-semibold text-[var(--ve-blue)]">
                {t.officialFeedTitle}
              </h2>
              <button
                type="button"
                onClick={() => setFeedOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground-muted)]"
              >
                {t.close}
              </button>
            </div>
            <OfficialFeed onSelectEvent={focusOfficialEvent} />
          </div>
        </aside>
      </main>

      {formMode && (
        <>
          <div
            className="fixed inset-0 z-[800] hidden bg-black/20 lg:block"
            aria-hidden
            onClick={closeForm}
          />
          <aside
            ref={panelRef}
            className={`form-sheet fixed inset-x-0 bottom-0 z-[900] flex flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-white shadow-2xl lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[min(100%,26rem)] lg:rounded-xl ${
              pickedLocation ? "max-h-[90dvh]" : "max-h-[48dvh]"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <div className="ve-tricolor shrink-0" aria-hidden />
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 id="form-title" className="text-base font-semibold text-[var(--ve-blue)] sm:text-lg">
                {formMode === "request" ? t.addRequest : t.addVideo}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="min-h-11 min-w-11 rounded-lg text-sm font-medium text-[var(--foreground-muted)] active:bg-[var(--panel-bg)]"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            <div
              className={`shrink-0 border-b px-4 py-3 text-sm font-medium ${
                pickedLocation
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-[var(--ve-yellow)] bg-[var(--ve-yellow-soft)] text-[#8a6d00]"
              }`}
              role="status"
              aria-live="polite"
            >
              {pickedLocation ? t.locationSelected : t.clickMapHint}
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {message && (
                <p
                  className={`mb-3 text-sm ${
                    message.type === "success" ? "text-emerald-700" : "text-red-700"
                  }`}
                  role="alert"
                >
                  {message.text}
                </p>
              )}

              {formMode === "request" ? (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="person_name" className="block text-sm font-medium">
                      {t.personName} <span aria-hidden>*</span>
                    </label>
                    <input
                      ref={firstFieldRef}
                      id="person_name"
                      name="person_name"
                      required
                      minLength={2}
                      autoComplete="name"
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.personNamePlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="last_seen_area" className="block text-sm font-medium">
                      {t.lastSeenArea} <span aria-hidden>*</span>
                    </label>
                    <input
                      id="last_seen_area"
                      name="last_seen_area"
                      required
                      minLength={2}
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.lastSeenPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium">
                      {t.description}
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.descriptionPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact_info" className="block text-sm font-medium">
                      {t.contactInfo} <span aria-hidden>*</span>
                    </label>
                    <input
                      id="contact_info"
                      name="contact_info"
                      required
                      minLength={3}
                      autoComplete="tel"
                      inputMode="tel"
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.contactPlaceholder}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!pickedLocation || submitting}
                    className="w-full min-h-12 rounded-xl bg-[var(--ve-red)] px-4 py-3 text-base font-semibold text-white active:bg-[#a81830] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  >
                    {submitting ? t.submitting : t.submit}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVideoSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="video_url" className="block text-sm font-medium">
                      {t.videoUrl} <span aria-hidden>*</span>
                    </label>
                    <input
                      ref={firstFieldRef}
                      id="video_url"
                      name="video_url"
                      type="url"
                      required
                      inputMode="url"
                      autoComplete="url"
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.videoUrlPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="area_name" className="block text-sm font-medium">
                      {t.areaName} <span aria-hidden>*</span>
                    </label>
                    <input
                      id="area_name"
                      name="area_name"
                      required
                      minLength={2}
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.areaPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium">
                      {t.videoTitle} <span aria-hidden>*</span>
                    </label>
                    <input
                      id="title"
                      name="title"
                      required
                      minLength={3}
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.videoTitlePlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="situation_type" className="block text-sm font-medium">
                      {t.situationType}
                    </label>
                    <select
                      id="situation_type"
                      name="situation_type"
                      defaultValue="damage"
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                    >
                      {(Object.keys(t.situationTypes) as SituationType[]).map((key) => (
                        <option key={key} value={key}>
                          {t.situationTypes[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="source_url" className="block text-sm font-medium">
                      {t.sourceUrl}
                    </label>
                    <input
                      id="source_url"
                      name="source_url"
                      type="url"
                      inputMode="url"
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.sourceUrlPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="video_description" className="block text-sm font-medium">
                      {t.description}
                    </label>
                    <textarea
                      id="video_description"
                      name="description"
                      rows={2}
                      className="input-field mt-1 w-full rounded-lg px-3 py-3 text-base sm:py-2 sm:text-sm"
                      placeholder={t.descriptionPlaceholder}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!pickedLocation || submitting}
                    className="w-full min-h-12 rounded-xl bg-[var(--ve-blue)] px-4 py-3 text-base font-semibold text-white active:bg-[#163366] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  >
                    {submitting ? t.submitting : t.submit}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

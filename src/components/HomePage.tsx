"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReliefMapLoader from "@/components/ReliefMapLoader";
import { CARACAS, EPICENTER } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type {
  CheckRequest,
  LayerVisibility,
  SituationType,
  VerifiedSituation,
} from "@/lib/types";

type FormMode = "request" | "video" | null;
type ViewMode = "split" | "map" | "list";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-VE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function HomePage() {
  const [requests, setRequests] = useState<CheckRequest[]>([]);
  const [videos, setVideos] = useState<VerifiedSituation[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState<LayerVisibility>({
    requests: true,
    videos: true,
  });
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, vidRes] = await Promise.all([
        fetch("/api/requests"),
        fetch("/api/videos"),
      ]);
      const reqJson = await reqRes.json();
      const vidJson = await vidRes.json();
      setRequests(reqJson.data ?? []);
      setVideos(vidJson.data ?? []);
      setConfigured(reqJson.configured !== false && vidJson.configured !== false);
    } catch {
      setMessage({ type: "error", text: t.errorGeneric });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (!formMode) return;
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [formMode]);

  useEffect(() => {
    if (!formMode) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeForm();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formMode]);

  function openForm(mode: FormMode) {
    setPickedLocation(null);
    setMessage(null);
    setFormMode(mode);
  }

  function closeForm() {
    setFormMode(null);
    setPickedLocation(null);
  }

  function focusPin(lat: number, lng: number) {
    setFlyToTarget({ lat, lng });
    setViewMode("split");
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
      if (!res.ok) throw new Error();
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
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: t.successVideo });
      closeForm();
      await loadData();
    } catch {
      setMessage({ type: "error", text: t.errorGeneric });
    } finally {
      setSubmitting(false);
    }
  }

  const visibleRequests = layers.requests ? requests : [];
  const visibleVideos = layers.videos ? videos : [];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg"
      >
        {t.skipToContent}
      </a>

      <header className="border-b border-amber-200 bg-amber-950 text-amber-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t.headerTitle}
            </h1>
            <p className="text-sm text-amber-100">{t.headerSubtitle}</p>
          </div>
          <p className="max-w-xl text-sm text-amber-100/90" role="note">
            {t.disclaimer}
          </p>
        </div>
      </header>

      {!configured && (
        <div
          className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm text-amber-950"
          role="alert"
        >
          {t.databaseNotConfigured}
        </div>
      )}

      {message && !formMode && (
        <div
          className={`border-b px-4 py-3 text-center text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row"
      >
        <section
          className={`flex flex-col gap-3 lg:w-[360px] ${
            viewMode === "map" ? "hidden lg:flex" : "flex"
          } ${viewMode === "list" ? "w-full" : ""}`}
          aria-label={t.listView}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openForm("request")}
              className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              {t.addRequest}
            </button>
            <button
              type="button"
              onClick={() => openForm("video")}
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {t.addVideo}
            </button>
          </div>

          <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
            <legend className="px-1 text-sm font-semibold text-slate-800">
              {t.legend}
            </legend>
            <div className="mt-1 flex flex-col gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.requests}
                  onChange={(e) =>
                    setLayers((l) => ({ ...l, requests: e.target.checked }))
                  }
                  className="size-4 rounded border-slate-300"
                />
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full bg-orange-600"
                    aria-hidden
                  />
                  {t.legendRequest} ({requests.length})
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.videos}
                  onChange={(e) =>
                    setLayers((l) => ({ ...l, videos: e.target.checked }))
                  }
                  className="size-4 rounded border-slate-300"
                />
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full bg-blue-700"
                    aria-hidden
                  />
                  {t.legendVideo} ({videos.length})
                </span>
              </label>
            </div>
          </fieldset>

          <div
            className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 lg:hidden"
            role="tablist"
            aria-label="Vista"
          >
            {(["split", "map", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-600 ${
                  viewMode === mode
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {mode === "split" ? "Ambos" : mode === "map" ? t.mapView : t.listView}
              </button>
            ))}
          </div>

          <div
            className="max-h-[50vh] flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white lg:max-h-none"
            aria-busy={loading}
          >
            {loading ? (
              <p className="p-4 text-sm text-slate-600" role="status">
                {t.loading}
              </p>
            ) : visibleRequests.length === 0 && visibleVideos.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">{t.noData}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleRequests.map((req) => (
                  <li key={req.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          <span
                            className="mr-2 inline-block size-2.5 rounded-full bg-orange-600 align-middle"
                            aria-hidden
                          />
                          {req.person_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {req.last_seen_area}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t.status[req.status]} · {formatDate(req.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => focusPin(req.lat, req.lng)}
                        className="shrink-0 text-sm font-medium text-blue-700 underline hover:text-blue-900"
                      >
                        {t.goToLocation}
                      </button>
                    </div>
                  </li>
                ))}
                {visibleVideos.map((video) => (
                  <li key={video.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          <span
                            className="mr-2 inline-block size-2.5 rounded-full bg-blue-700 align-middle"
                            aria-hidden
                          />
                          {video.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {video.area_name}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-3 text-sm">
                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-700 underline"
                          >
                            {t.watchVideo}
                          </a>
                          {video.source_url && (
                            <a
                              href={video.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-700 underline"
                            >
                              {t.viewSource}
                            </a>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => focusPin(video.lat, video.lng)}
                        className="shrink-0 text-sm font-medium text-blue-700 underline hover:text-blue-900"
                      >
                        {t.goToLocation}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          className={`min-h-[50vh] flex-1 ${
            viewMode === "list" ? "hidden lg:block" : "block"
          }`}
          aria-label={t.mapView}
        >
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFlyToTarget({ lat: EPICENTER.lat, lng: EPICENTER.lng })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-600"
            >
              {t.focusEpicenter}
            </button>
            <button
              type="button"
              onClick={() => setFlyToTarget({ lat: CARACAS.lat, lng: CARACAS.lng })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-600"
            >
              {t.focusCaracas}
            </button>
          </div>
          <div className="h-[50vh] lg:h-[calc(100vh-12rem)]">
            <ReliefMapLoader
              requests={visibleRequests}
              videos={visibleVideos}
              layers={layers}
              pickMode={Boolean(formMode)}
              pickedLocation={pickedLocation}
              flyToTarget={flyToTarget}
              onPickLocation={(lat, lng) => setPickedLocation({ lat, lng })}
            />
          </div>
        </section>
      </main>

      {formMode && (
        <aside
          ref={panelRef}
          className="fixed bottom-0 right-0 top-auto z-[1500] flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-[min(100%,24rem)] sm:rounded-xl"
          role="dialog"
          aria-modal="false"
          aria-labelledby="form-title"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 id="form-title" className="text-lg font-semibold text-slate-900">
              {formMode === "request" ? t.addRequest : t.addVideo}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-600"
              aria-label={t.close}
            >
              {t.close}
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-3">
            <p className="mb-3 text-sm text-slate-600" role="status" aria-live="polite">
              {pickedLocation ? t.locationSelected : t.clickMapHint}
            </p>

            {message && (
              <p
                className={`mb-3 text-sm ${
                  message.type === "success" ? "text-emerald-800" : "text-red-800"
                }`}
                role="alert"
              >
                {message.text}
              </p>
            )}

            {formMode === "request" ? (
              <form onSubmit={handleRequestSubmit} className="space-y-3">
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder={t.contactPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={!pickedLocation || submitting}
                className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
          ) : formMode === "video" ? (
            <form onSubmit={handleVideoSubmit} className="space-y-3">
              <div>
                <label htmlFor="area_name" className="block text-sm font-medium">
                  {t.areaName} <span aria-hidden>*</span>
                </label>
                <input
                  ref={firstFieldRef}
                  id="area_name"
                  name="area_name"
                  required
                  minLength={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {(Object.keys(t.situationTypes) as SituationType[]).map((key) => (
                    <option key={key} value={key}>
                      {t.situationTypes[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="video_url" className="block text-sm font-medium">
                  {t.videoUrl} <span aria-hidden>*</span>
                </label>
                <input
                  id="video_url"
                  name="video_url"
                  type="url"
                  required
                  inputMode="url"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={t.videoUrlPlaceholder}
                />
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder={t.descriptionPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={!pickedLocation || submitting}
                className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
            ) : null}
          </div>
        </aside>
      )}
    </>
  );
}

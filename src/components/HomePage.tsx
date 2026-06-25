"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReliefMapLoader from "@/components/ReliefMapLoader";
import OfficialFeed from "@/components/OfficialFeed";
import { CARACAS, EPICENTER } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { OfficialFeedItem } from "@/lib/official-types";
import type {
  CheckRequest,
  LayerVisibility,
  SituationType,
  VerifiedSituation,
} from "@/lib/types";

type FormMode = "request" | "video" | null;
type SidebarTab = "official" | "community";
type ViewMode = "split" | "map" | "feed";

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
    official: true,
  });
  const [officialEvents, setOfficialEvents] = useState<OfficialFeedItem[]>([]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("official");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("feed");
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

  function focusOfficialEvent(item: OfficialFeedItem) {
    if (item.lat == null || item.lng == null) return;
    setFlyToTarget({ lat: item.lat, lng: item.lng });
    setViewMode("split");
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

      <div className="ve-tricolor" aria-hidden />

      <header className="border-b border-[var(--border)] bg-white shadow-sm">
        <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--ve-blue)] sm:text-2xl">
              {t.headerTitle}
            </h1>
            <p className="text-sm text-[var(--foreground-muted)]">{t.headerSubtitle}</p>
          </div>
          <p className="max-w-xl text-xs text-[var(--foreground-muted)] sm:text-sm" role="note">
            {t.disclaimer}
          </p>
        </div>
      </header>

      {!configured && (
        <div
          className="border-b border-[var(--ve-yellow)] bg-[var(--ve-yellow-soft)] px-4 py-2 text-center text-sm text-[#8a6d00]"
          role="alert"
        >
          {t.databaseNotConfigured}
        </div>
      )}

      {message && !formMode && (
        <div
          className={`border-b px-4 py-2 text-center text-sm ${
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
        className="flex min-h-0 flex-1 flex-col lg:h-[calc(100vh-5.5rem)] lg:flex-row"
      >
        <aside
          className={`feed-panel flex w-full flex-col border-r border-[var(--border)] lg:w-[380px] ${
            viewMode === "map" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div
            className="flex border-b border-[var(--border)] bg-[var(--panel-bg)] lg:hidden"
            role="tablist"
            aria-label="Vista"
          >
            {(
              [
                ["feed", t.tabOfficial],
                ["split", t.tabCommunity],
                ["map", t.tabMap],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 px-3 py-2.5 text-xs font-semibold ${
                  viewMode === mode ? "tab-active" : "tab-inactive"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hidden border-b border-[var(--border)] lg:flex" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === "official"}
              onClick={() => setSidebarTab("official")}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold ${
                sidebarTab === "official" ? "tab-active" : "tab-inactive"
              }`}
            >
              {t.tabOfficial}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === "community"}
              onClick={() => setSidebarTab("community")}
              className={`flex-1 px-3 py-2.5 text-xs font-semibold ${
                sidebarTab === "community" ? "tab-active" : "tab-inactive"
              }`}
            >
              {t.tabCommunity}
            </button>
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
              sidebarTab === "official" ? "flex" : "hidden lg:flex"
            } ${viewMode === "feed" ? "!flex" : viewMode === "map" ? "hidden" : ""}`}
          >
            <OfficialFeed onSelectEvent={focusOfficialEvent} />
          </div>

          <div
            className={`community-panel flex min-h-0 flex-1 flex-col overflow-hidden ${
              sidebarTab === "community" ? "flex" : "hidden lg:flex"
            } ${viewMode === "split" ? "flex lg:flex" : viewMode === "feed" ? "hidden" : viewMode === "map" ? "hidden" : ""}`}
          >
            <div className="border-b border-[var(--border)] bg-[var(--panel-bg)] px-3 py-2.5">
              <h2 className="text-sm font-semibold text-[var(--ve-blue)]">
                {t.communityFeedTitle}
              </h2>
              <p className="text-xs text-[var(--foreground-muted)]">
                {t.communityFeedSubtitle}
              </p>
            </div>

            <div className="space-y-3 border-b border-[var(--border)] p-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openForm("request")}
                  className="btn-ve-primary rounded-lg px-3 py-2 text-sm font-medium"
                >
                  {t.addRequest}
                </button>
                <button
                  type="button"
                  onClick={() => openForm("video")}
                  className="btn-ve-secondary rounded-lg px-3 py-2 text-sm font-medium"
                >
                  {t.addVideo}
                </button>
              </div>

              <fieldset className="text-sm">
                <legend className="mb-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
                  {t.legend}
                </legend>
                <div className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layers.official}
                      onChange={(e) =>
                        setLayers((l) => ({ ...l, official: e.target.checked }))
                      }
                      className="size-3.5"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-full bg-[var(--ve-red)]" aria-hidden />
                      {t.legendOfficial} ({officialEvents.filter((e) => e.lat != null).length})
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layers.requests}
                      onChange={(e) =>
                        setLayers((l) => ({ ...l, requests: e.target.checked }))
                      }
                      className="size-3.5"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-full bg-[var(--ve-yellow)]" aria-hidden />
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
                      className="size-3.5"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-2.5 rounded-full bg-[var(--ve-blue)] ring-1 ring-[var(--border)]" aria-hidden />
                      {t.legendVideo} ({videos.length})
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="flex-1 overflow-y-auto" aria-busy={loading}>
              {loading ? (
                <p className="p-3 text-sm text-[var(--foreground-muted)]">{t.loading}</p>
              ) : visibleRequests.length === 0 && visibleVideos.length === 0 ? (
                <p className="p-3 text-sm text-[var(--foreground-muted)]">{t.noData}</p>
              ) : (
                <ul>
                  {visibleRequests.map((req) => (
                    <li key={req.id} className="border-b border-[var(--border)] px-3 py-3 hover:bg-[var(--panel-bg)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {req.person_name}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                            {req.last_seen_area}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">
                            {t.status[req.status]} · {formatDate(req.created_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => focusPin(req.lat, req.lng)}
                          className="shrink-0 text-xs font-medium text-[var(--ve-blue)] underline hover:text-[var(--ve-red)]"
                        >
                          {t.goToLocation}
                        </button>
                      </div>
                    </li>
                  ))}
                  {visibleVideos.map((video) => (
                    <li key={video.id} className="border-b border-[var(--border)] px-3 py-3 hover:bg-[var(--panel-bg)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{video.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                            {video.area_name}
                          </p>
                          <p className="mt-1 flex gap-2 text-xs">
                            <a
                              href={video.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--ve-blue)] underline hover:text-[var(--ve-red)]"
                            >
                              {t.watchVideo}
                            </a>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => focusPin(video.lat, video.lng)}
                          className="shrink-0 text-xs font-medium text-[var(--ve-blue)] underline hover:text-[var(--ve-red)]"
                        >
                          {t.goToLocation}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>

        <section
          className={`relative min-h-[50vh] flex-1 bg-[var(--panel-bg)] p-2 lg:p-3 ${
            viewMode === "feed" ? "hidden lg:block" : "block"
          }`}
          aria-label={t.mapView}
        >
          <div className="absolute left-5 top-5 z-[500] flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFlyToTarget({ lat: EPICENTER.lat, lng: EPICENTER.lng })}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ve-blue)] shadow-sm hover:bg-[var(--ve-blue-soft)]"
            >
              {t.focusEpicenter}
            </button>
            <button
              type="button"
              onClick={() => setFlyToTarget({ lat: CARACAS.lat, lng: CARACAS.lng })}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-white"
            >
              {t.focusCaracas}
            </button>
          </div>
          <div className="h-[50vh] overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm lg:h-[calc(100%-0.5rem)]">
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
        </section>
      </main>

      {formMode && (
        <aside
          ref={panelRef}
          className="fixed bottom-0 right-0 top-auto z-[1500] flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-white shadow-xl sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-[min(100%,24rem)] sm:rounded-xl"
          role="dialog"
          aria-modal="false"
          aria-labelledby="form-title"
        >
          <div className="ve-tricolor shrink-0 rounded-t-2xl sm:rounded-t-xl" aria-hidden />
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 id="form-title" className="text-lg font-semibold text-[var(--ve-blue)]">
              {formMode === "request" ? t.addRequest : t.addVideo}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--panel-bg)]"
              aria-label={t.close}
            >
              {t.close}
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-3">
            <p className="mb-3 text-sm text-[var(--foreground-muted)]" role="status" aria-live="polite">
              {pickedLocation ? t.locationSelected : t.clickMapHint}
            </p>

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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
                  placeholder={t.contactPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={!pickedLocation || submitting}
                className="w-full rounded-lg bg-[var(--ve-red)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a81830] disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
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
                  className="input-field mt-1 w-full rounded-lg px-3 py-2 text-sm"
                  placeholder={t.descriptionPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={!pickedLocation || submitting}
                className="w-full rounded-lg bg-[var(--ve-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163366] disabled:cursor-not-allowed disabled:opacity-50"
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

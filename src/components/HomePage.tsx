"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReliefMapLoader from "@/components/ReliefMapLoader";
import OfficialFeed from "@/components/OfficialFeed";
import SiteHeader from "@/components/SiteHeader";
import HowToModal from "@/components/HowToModal";
import MobileToast from "@/components/MobileToast";
import MapLegend from "@/components/MapLegend";
import { useTranslation } from "@/components/LocaleProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CARACAS, EPICENTER } from "@/lib/constants";
import type { OfficialFeedItem } from "@/lib/official-types";
import type {
  CheckRequest,
  LayerVisibility,
  SituationType,
  VerifiedSituation,
} from "@/lib/types";

type FormMode = "request" | "video" | null;
type FormStep = "pick" | "fill";

const COACH_KEY = "terremoto2026-coach-dismissed";

const ALL_LAYERS: LayerVisibility = {
  requests: true,
  videos: true,
  official: true,
};

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
  const isMobile = useIsMobile();
  const [howToOpen, setHowToOpen] = useState(false);
  const [requests, setRequests] = useState<CheckRequest[]>([]);
  const [videos, setVideos] = useState<VerifiedSituation[]>([]);
  const [configured, setConfigured] = useState(true);
  const [officialEvents, setOfficialEvents] = useState<OfficialFeedItem[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formStep, setFormStep] = useState<FormStep>("pick");
  const [showCoach, setShowCoach] = useState(false);
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

  const mobileWizard = isMobile && Boolean(formMode);
  const onPickStep = mobileWizard && formStep === "pick";
  const onFillStep = !mobileWizard || formStep === "fill";

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
    if (typeof window === "undefined") return;
    setShowCoach(!sessionStorage.getItem(COACH_KEY));
  }, []);

  useEffect(() => {
    const locked = Boolean(formMode) || feedOpen || howToOpen;
    document.body.classList.toggle("scroll-locked", locked);
    return () => document.body.classList.remove("scroll-locked");
  }, [formMode, feedOpen, howToOpen]);

  useEffect(() => {
    if (!formMode || !onFillStep) return;
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 300);
    return () => window.clearTimeout(timer);
  }, [formMode, onFillStep, formStep]);

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
    if (!message || formMode) return;
    const timer = window.setTimeout(() => setMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [message, formMode]);

  function dismissCoach() {
    sessionStorage.setItem(COACH_KEY, "1");
    setShowCoach(false);
  }

  function openForm(mode: FormMode) {
    setFeedOpen(false);
    setPickedLocation(null);
    setMessage(null);
    setFormStep("pick");
    setFormMode(mode);
    dismissCoach();
  }

  function closeForm() {
    setFormMode(null);
    setFormStep("pick");
    setPickedLocation(null);
  }

  function handlePickLocation(lat: number, lng: number) {
    setPickedLocation({ lat, lng });
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
  }

  function goToFillStep() {
    if (!pickedLocation) return;
    setFormStep("fill");
  }

  function backToPickStep() {
    setFormStep("pick");
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

  const visibleOfficial = officialEvents;
  const visibleRequests = requests;
  const visibleVideos = videos;
  const hideActionBar = Boolean(formMode) || feedOpen;

  return (
    <div className="app-shell flex h-dvh flex-col overflow-hidden">
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
          className="shrink-0 border-b border-[var(--ve-yellow)] bg-[var(--ve-yellow-soft)] px-3 py-1 text-center text-xs text-[#8a6d00]"
          role="alert"
        >
          {t.databaseNotConfigured}
        </div>
      )}

      {message && !formMode && (
        <MobileToast
          message={message.text}
          type={message.type}
          onDismiss={() => setMessage(null)}
        />
      )}

      <main
        id="main-content"
        className="relative flex min-h-0 flex-1 flex-col lg:flex-row"
      >
        <section
          className="relative flex min-h-0 flex-1 flex-col lg:order-2"
          aria-label={t.mapView}
        >
          <div className="map-toolbar absolute left-0 right-0 top-0 z-[500] flex gap-2 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() =>
                setFlyToTarget({ lat: EPICENTER.lat, lng: EPICENTER.lng })
              }
              className="map-chip shrink-0"
            >
              {t.focusEpicenter}
            </button>
            <button
              type="button"
              onClick={() =>
                setFlyToTarget({ lat: CARACAS.lat, lng: CARACAS.lng })
              }
              className="map-chip shrink-0 text-slate-600"
            >
              {t.focusCaracas}
            </button>
          </div>

          {showCoach && isMobile && !formMode && (
            <div className="absolute inset-x-3 top-[3.25rem] z-[480] rounded-xl border border-[var(--ve-blue)]/20 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur-sm">
              <p className="pr-16 text-xs leading-relaxed text-slate-700">
                {t.mobileCoach}
              </p>
              <button
                type="button"
                onClick={dismissCoach}
                className="absolute right-2 top-2 rounded-lg bg-[var(--ve-blue)] px-2.5 py-1 text-xs font-semibold text-white"
              >
                {t.dismissCoach}
              </button>
            </div>
          )}

          <div className="map-surface min-h-0 flex-1">
            <MapLegend />
            <ReliefMapLoader
              requests={visibleRequests}
              videos={visibleVideos}
              officialEvents={visibleOfficial}
              layers={ALL_LAYERS}
              pickMode={Boolean(formMode)}
              pickedLocation={pickedLocation}
              flyToTarget={flyToTarget}
              onPickLocation={handlePickLocation}
            />
          </div>

          <div
            className={`mobile-action-bar fixed inset-x-0 bottom-0 z-[600] lg:hidden ${
              hideActionBar ? "pointer-events-none translate-y-full opacity-0" : ""
            }`}
            role="toolbar"
            aria-label={t.reportToolbar}
            aria-hidden={hideActionBar}
          >
            <div className="border-t border-[var(--border)] bg-white/95 px-2 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div className="mx-auto flex max-w-lg gap-2">
                <button
                  type="button"
                  onClick={() => setFeedOpen(true)}
                  className="mobile-fab mobile-fab-secondary"
                >
                  <span aria-hidden>📡</span>
                  {t.fabFeed}
                </button>
                <button
                  type="button"
                  onClick={() => openForm("video")}
                  className="mobile-fab mobile-fab-primary"
                >
                  <span aria-hidden>🎥</span>
                  {t.fabVideo}
                </button>
                <button
                  type="button"
                  onClick={() => openForm("request")}
                  className="mobile-fab mobile-fab-danger"
                >
                  <span aria-hidden>🔍</span>
                  {t.fabRequest}
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-[500] hidden flex-col gap-2 lg:flex">
            <button type="button" onClick={() => openForm("video")} className="desktop-report-btn bg-[var(--ve-blue)] hover:bg-[#163366]">
              {t.addVideo}
            </button>
            <button type="button" onClick={() => openForm("request")} className="desktop-report-btn bg-[var(--ve-red)] hover:bg-[#a81830]">
              {t.addRequest}
            </button>
          </div>
        </section>

        <aside
          className={`feed-panel flex w-full flex-col border-[var(--border)] bg-white lg:w-[320px] lg:shrink-0 lg:border-r ${
            feedOpen
              ? "fixed inset-0 z-[700] lg:relative lg:inset-auto lg:z-auto"
              : "hidden lg:flex"
          }`}
        >
          {feedOpen && (
            <button
              type="button"
              className="absolute inset-0 bg-black/45 lg:hidden"
              aria-label={t.close}
              onClick={() => setFeedOpen(false)}
            />
          )}
          <div
            className={`relative flex min-h-0 flex-1 flex-col bg-white ${
              feedOpen
                ? "sheet-panel absolute inset-x-0 bottom-0 max-h-[80dvh] rounded-t-2xl shadow-2xl lg:relative lg:inset-auto lg:max-h-none lg:rounded-none lg:shadow-none"
                : ""
            }`}
          >
            <div className="sheet-handle mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 lg:hidden" aria-hidden />
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 lg:hidden">
              <h2 className="text-sm font-semibold text-[var(--ve-blue)]">
                {t.officialFeedTitle}
              </h2>
              <button
                type="button"
                onClick={() => setFeedOpen(false)}
                className="min-h-10 min-w-10 rounded-lg text-sm font-medium text-[var(--foreground-muted)]"
              >
                ✕
              </button>
            </div>
            <OfficialFeed onSelectEvent={focusOfficialEvent} />
          </div>
        </aside>
      </main>

      {formMode && (
        <>
          <div
            className="fixed inset-0 z-[800] hidden bg-black/25 lg:block"
            aria-hidden
            onClick={closeForm}
          />
          <aside
            ref={panelRef}
            className={`form-sheet fixed inset-x-0 bottom-0 z-[900] flex flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-white shadow-2xl lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[min(100%,26rem)] lg:rounded-xl ${
              onPickStep ? "form-sheet-pick" : "form-sheet-fill"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <div className="sheet-handle mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 lg:hidden" aria-hidden />
            <div className="ve-tricolor hidden shrink-0 lg:block" aria-hidden />

            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)] lg:hidden">
                  {onPickStep ? t.pickLocationTitle : t.fillDetailsTitle}
                </p>
                <h2 id="form-title" className="text-base font-semibold text-[var(--ve-blue)]">
                  {formMode === "request" ? t.addRequest : t.addVideo}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg text-[var(--foreground-muted)] active:bg-[var(--panel-bg)]"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            {onPickStep ? (
              <div className="flex flex-col gap-3 px-4 py-4">
                <p
                  className={`rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ${
                    pickedLocation
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-[var(--ve-yellow-soft)] text-[#8a6d00] ring-1 ring-[var(--ve-yellow)]/40"
                  }`}
                  role="status"
                >
                  {pickedLocation ? t.locationSelected : t.pickLocationHint}
                </p>
                <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">
                  {t.clickMapHint}
                </p>
                <button
                  type="button"
                  disabled={!pickedLocation}
                  onClick={goToFillStep}
                  className="min-h-12 w-full rounded-xl bg-[var(--ve-blue)] text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#163366]"
                >
                  {t.continueButton}
                </button>
              </div>
            ) : (
              <>
                {mobileWizard && (
                  <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--panel-bg)] px-4 py-2">
                    <button
                      type="button"
                      onClick={backToPickStep}
                      className="text-sm font-medium text-[var(--ve-blue)] underline"
                    >
                      ← {t.changeLocation}
                    </button>
                    <span className="text-xs text-emerald-700">{t.locationSelected}</span>
                  </div>
                )}

                {!mobileWizard && (
                  <div
                    className={`shrink-0 border-b px-4 py-3 text-sm font-medium ${
                      pickedLocation
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-[var(--ve-yellow)] bg-[var(--ve-yellow-soft)] text-[#8a6d00]"
                    }`}
                    role="status"
                  >
                    {pickedLocation ? t.locationSelected : t.clickMapHint}
                  </div>
                )}

                <div className="form-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  {message && (
                    <p
                      className={`mb-3 rounded-lg px-3 py-2 text-sm ${
                        message.type === "success"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-red-50 text-red-800"
                      }`}
                      role="alert"
                    >
                      {message.text}
                    </p>
                  )}

                  {formMode === "request" ? (
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                      <Field label={t.personName} htmlFor="person_name" required>
                        <input
                          ref={firstFieldRef}
                          id="person_name"
                          name="person_name"
                          required
                          minLength={2}
                          autoComplete="name"
                          className="input-field input-touch"
                          placeholder={t.personNamePlaceholder}
                        />
                      </Field>
                      <Field label={t.lastSeenArea} htmlFor="last_seen_area" required>
                        <input
                          id="last_seen_area"
                          name="last_seen_area"
                          required
                          minLength={2}
                          className="input-field input-touch"
                          placeholder={t.lastSeenPlaceholder}
                        />
                      </Field>
                      <Field label={t.description} htmlFor="description">
                        <textarea
                          id="description"
                          name="description"
                          rows={2}
                          className="input-field input-touch"
                          placeholder={t.descriptionPlaceholder}
                        />
                      </Field>
                      <Field label={t.contactInfo} htmlFor="contact_info" required>
                        <input
                          id="contact_info"
                          name="contact_info"
                          required
                          minLength={3}
                          autoComplete="tel"
                          inputMode="tel"
                          className="input-field input-touch"
                          placeholder={t.contactPlaceholder}
                        />
                      </Field>
                      <SubmitButton
                        color="red"
                        disabled={!pickedLocation || submitting}
                        loading={submitting}
                        label={submitting ? t.submitting : t.submit}
                      />
                    </form>
                  ) : (
                    <form onSubmit={handleVideoSubmit} className="space-y-4">
                      <Field label={t.videoUrl} htmlFor="video_url" required>
                        <input
                          ref={firstFieldRef}
                          id="video_url"
                          name="video_url"
                          type="url"
                          required
                          inputMode="url"
                          autoComplete="url"
                          className="input-field input-touch"
                          placeholder={t.videoUrlPlaceholder}
                        />
                      </Field>
                      <Field label={t.areaName} htmlFor="area_name" required>
                        <input
                          id="area_name"
                          name="area_name"
                          required
                          minLength={2}
                          className="input-field input-touch"
                          placeholder={t.areaPlaceholder}
                        />
                      </Field>
                      <Field label={t.videoTitle} htmlFor="title" required>
                        <input
                          id="title"
                          name="title"
                          required
                          minLength={3}
                          className="input-field input-touch"
                          placeholder={t.videoTitlePlaceholder}
                        />
                      </Field>
                      <Field label={t.situationType} htmlFor="situation_type">
                        <select
                          id="situation_type"
                          name="situation_type"
                          defaultValue="damage"
                          className="input-field input-touch"
                        >
                          {(Object.keys(t.situationTypes) as SituationType[]).map((key) => (
                            <option key={key} value={key}>
                              {t.situationTypes[key]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t.sourceUrl} htmlFor="source_url">
                        <input
                          id="source_url"
                          name="source_url"
                          type="url"
                          inputMode="url"
                          className="input-field input-touch"
                          placeholder={t.sourceUrlPlaceholder}
                        />
                      </Field>
                      <Field label={t.description} htmlFor="video_description">
                        <textarea
                          id="video_description"
                          name="description"
                          rows={2}
                          className="input-field input-touch"
                          placeholder={t.descriptionPlaceholder}
                        />
                      </Field>
                      <SubmitButton
                        color="blue"
                        disabled={!pickedLocation || submitting}
                        loading={submitting}
                        label={submitting ? t.submitting : t.submit}
                      />
                    </form>
                  )}
                </div>
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label} {required && <span aria-hidden>*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SubmitButton({
  color,
  disabled,
  loading,
  label,
}: {
  color: "red" | "blue";
  disabled: boolean;
  loading: boolean;
  label: string;
}) {
  const bg =
    color === "red"
      ? "bg-[var(--ve-red)] active:bg-[#a81830]"
      : "bg-[var(--ve-blue)] active:bg-[#163366]";
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`min-h-12 w-full rounded-xl px-4 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${bg}`}
      aria-busy={loading}
    >
      {label}
    </button>
  );
}

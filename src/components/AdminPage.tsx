"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/LocaleProvider";
import type { CheckRequest, VerifiedSituation } from "@/lib/types";

const TOKEN_KEY = "tv2026_admin_token";

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

export default function AdminPage() {
  const { t, locale, setLocale } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CheckRequest[]>([]);
  const [videos, setVideos] = useState<VerifiedSituation[]>([]);
  const [publishedRequests, setPublishedRequests] = useState<CheckRequest[]>([]);
  const [publishedVideos, setPublishedVideos] = useState<VerifiedSituation[]>([]);

  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY));
  }, []);

  const loadPending = useCallback(async (adminToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pending", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setError(t.adminUnauthorized);
        return;
      }
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRequests(json.requests ?? []);
      setVideos(json.videos ?? []);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [t.adminUnauthorized, t.errorGeneric]);

  const loadPublished = useCallback(async (adminToken: string) => {
    try {
      const res = await fetch("/api/admin/published", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setPublishedRequests(json.requests ?? []);
      setPublishedVideos(json.videos ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadAll = useCallback(
    async (adminToken: string) => {
      await Promise.all([loadPending(adminToken), loadPublished(adminToken)]);
    },
    [loadPending, loadPublished],
  );

  useEffect(() => {
    if (token) loadAll(token);
  }, [token, loadAll]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    sessionStorage.setItem(TOKEN_KEY, password.trim());
    setToken(password.trim());
    setPassword("");
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRequests([]);
    setVideos([]);
    setPublishedRequests([]);
    setPublishedVideos([]);
  }

  async function moderate(
    type: "request" | "video",
    id: string,
    approved: boolean,
  ) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, id, approved }),
      });
      if (!res.ok) throw new Error();
      await loadAll(token);
    } catch {
      setError(t.errorGeneric);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-white px-4 py-8 text-slate-700">
      <div className="ve-tricolor mb-6 rounded" aria-hidden />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ve-blue)]">{t.adminTitle}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">{t.adminSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-0.5"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => setLocale("es")}
              aria-pressed={locale === "es"}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                locale === "es" ? "bg-[var(--ve-blue)] text-white" : "text-slate-500"
              }`}
            >
              {t.langEs}
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                locale === "en" ? "bg-[var(--ve-blue)] text-white" : "text-slate-500"
              }`}
            >
              {t.langEn}
            </button>
          </div>
          <Link
          href="/"
          className="text-sm font-medium text-[var(--ve-blue)] underline hover:text-[var(--ve-red)]"
        >
          {t.adminBackToMap}
        </Link>
        </div>
      </div>

      {!token ? (
        <form
          onSubmit={handleLogin}
          className="mx-auto max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium">
              {t.adminPassword}
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--ve-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163366]"
          >
            {t.adminLogin}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600" role="status">
              {loading
                ? t.loading
                : `${t.adminPendingRequests}: ${requests.length} · ${t.adminPendingVideos}: ${videos.length}`}
            </p>
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium text-slate-700 underline"
            >
              {t.adminLogout}
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}

          <section aria-labelledby="pending-requests-heading">
            <h2 id="pending-requests-heading" className="text-lg font-semibold">
              {t.adminPendingRequests}
            </h2>
            {requests.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{t.adminNonePending}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {requests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="font-semibold">{req.person_name}</p>
                    <p className="mt-1 text-sm text-slate-700">{req.last_seen_area}</p>
                    {req.description && (
                      <p className="mt-1 text-sm text-slate-600">{req.description}</p>
                    )}
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{t.contact}:</span> {req.contact_info}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(req.created_at, locale)}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => moderate("request", req.id, true)}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        {t.adminApprove}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate("request", req.id, false)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
                      >
                        {t.adminReject}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="pending-videos-heading">
            <h2 id="pending-videos-heading" className="text-lg font-semibold">
              {t.adminPendingVideos}
            </h2>
            {videos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{t.adminNonePending}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {videos.map((video) => (
                  <li
                    key={video.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="font-semibold">{video.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{video.area_name}</p>
                    <p className="mt-1 text-sm">
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                      >
                        {t.watchVideo}
                      </a>
                      {video.source_url && (
                        <>
                          {" · "}
                          <a
                            href={video.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 underline"
                          >
                            {t.viewSource}
                          </a>
                        </>
                      )}
                    </p>
                    {video.description && (
                      <p className="mt-1 text-sm text-slate-600">{video.description}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{formatDate(video.created_at, locale)}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => moderate("video", video.id, true)}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        {t.adminApprove}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate("video", video.id, false)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
                      >
                        {t.adminReject}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="published-requests-heading">
            <h2 id="published-requests-heading" className="text-lg font-semibold">
              {t.adminPublishedRequests}
            </h2>
            {publishedRequests.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{t.adminNonePublished}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {publishedRequests.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <p className="font-semibold">{req.person_name}</p>
                    <p className="mt-1 text-sm text-slate-700">{req.last_seen_area}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(req.created_at, locale)}
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => moderate("request", req.id, false)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
                      >
                        {t.adminDelete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="published-videos-heading">
            <h2 id="published-videos-heading" className="text-lg font-semibold">
              {t.adminPublishedVideos}
            </h2>
            {publishedVideos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{t.adminNonePublished}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {publishedVideos.map((video) => (
                  <li
                    key={video.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <p className="font-semibold">{video.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{video.area_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(video.created_at, locale)}
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => moderate("video", video.id, false)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
                      >
                        {t.adminDelete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

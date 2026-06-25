"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import type { CheckRequest, VerifiedSituation } from "@/lib/types";

const TOKEN_KEY = "tv2026_admin_token";

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

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CheckRequest[]>([]);
  const [videos, setVideos] = useState<VerifiedSituation[]>([]);

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
  }, []);

  useEffect(() => {
    if (token) loadPending(token);
  }, [token, loadPending]);

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
      await loadPending(token);
    } catch {
      setError(t.errorGeneric);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-[var(--ve-blue-dark)] px-4 py-8 text-white">
      <div className="ve-tricolor mb-4 rounded" aria-hidden />
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ve-yellow)]">{t.adminTitle}</h1>
          <p className="mt-1 text-sm text-white/70">{t.adminSubtitle}</p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-[var(--ve-yellow)] underline hover:text-white"
        >
          {t.adminBackToMap}
        </Link>
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
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
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
                    <p className="mt-1 text-xs text-slate-500">{formatDate(req.created_at)}</p>
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
                    <p className="mt-1 text-xs text-slate-500">{formatDate(video.created_at)}</p>
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
        </div>
      )}
    </div>
  );
}

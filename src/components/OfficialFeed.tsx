"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/LocaleProvider";
import type { OfficialFeedItem } from "@/lib/official-types";

import type { Messages } from "@/lib/i18n";

function formatRelativeTime(iso: string, t: Messages) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return t.hoursAgo(hours);
  try {
    return new Intl.DateTimeFormat("es-VE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function sourceStyles(source: OfficialFeedItem["source"]) {
  if (source === "USGS") {
    return "bg-[var(--ve-red-soft)] text-[var(--ve-red)] ring-1 ring-[var(--ve-red)]/20";
  }
  return "bg-[var(--ve-yellow-soft)] text-[#8a6d00] ring-1 ring-[var(--ve-yellow)]/30";
}

export interface OfficialFeedProps {
  onSelectEvent?: (item: OfficialFeedItem) => void;
  compact?: boolean;
}

export default function OfficialFeed({
  onSelectEvent,
  compact = false,
}: OfficialFeedProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<OfficialFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [sources, setSources] = useState({ usgs: false, funvisis: false });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/official-feed", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setItems(json.items ?? []);
      setLastUpdate(json.fetchedAt ?? null);
      setSources(json.sources ?? { usgs: false, funvisis: false });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <section
      className={`flex flex-col ${compact ? "" : "min-h-0 flex-1"}`}
      aria-label={t.officialFeedTitle}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--panel-bg)] px-3 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ve-blue)]">
            {t.officialFeedTitle}
          </h2>
          <p className="text-xs text-[var(--foreground-muted)]">
            {t.officialFeedSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--foreground-muted)] hover:bg-[var(--panel-bg)]"
          aria-label={t.refreshFeed}
        >
          ↻
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-[var(--border)] px-3 py-2 text-[11px]">
        <span
          className={`rounded-full px-2 py-0.5 ${
            sources.usgs
              ? "bg-[var(--ve-red-soft)] text-[var(--ve-red)]"
              : "bg-[var(--panel-bg)] text-[var(--foreground-muted)]"
          }`}
        >
          USGS {sources.usgs ? "●" : "○"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 ${
            sources.funvisis
              ? "bg-[var(--ve-yellow-soft)] text-[#8a6d00]"
              : "bg-[var(--panel-bg)] text-[var(--foreground-muted)]"
          }`}
        >
          FUNVISIS {sources.funvisis ? "●" : "○"}
        </span>
        {lastUpdate && (
          <span className="ml-auto text-[var(--foreground-muted)]">
            {formatRelativeTime(lastUpdate, t)}
          </span>
        )}
      </div>

      <div
        className={`overflow-y-auto ${compact ? "max-h-64" : "flex-1"}`}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && items.length === 0 ? (
          <p className="p-3 text-sm text-[var(--foreground-muted)]">
            {t.loadingOfficial}
          </p>
        ) : items.length === 0 ? (
          <p className="p-3 text-sm text-[var(--foreground-muted)]">
            {t.officialFeedEmpty}
          </p>
        ) : (
          <ul>
            {items.map((item) => {
              const isMajor = (item.magnitude ?? 0) >= 5;
              return (
                <li
                  key={item.id}
                  className={`border-b border-[var(--border)] px-3 py-3 transition-colors hover:bg-[var(--panel-bg)] ${
                    isMajor
                      ? "border-l-[3px] border-l-[var(--ve-red)] bg-[var(--ve-red-soft)]/40"
                      : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <time
                      className="shrink-0 text-[11px] text-[var(--foreground-muted)]"
                      dateTime={item.time}
                    >
                      {formatRelativeTime(item.time, t)}
                    </time>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sourceStyles(item.source)}`}
                    >
                      {item.source}
                    </span>
                    {item.magnitude != null && (
                      <span className="ml-auto shrink-0 text-sm font-semibold text-[var(--ve-red)]">
                        M{item.magnitude.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-snug text-slate-800">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {item.lat != null && item.lng != null && onSelectEvent && (
                      <button
                        type="button"
                        onClick={() => onSelectEvent(item)}
                        className="font-medium text-[var(--ve-blue)] underline hover:text-[var(--ve-red)]"
                      >
                        {t.showOnMap}
                      </button>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--foreground-muted)] underline hover:text-[var(--ve-blue)]"
                    >
                      {t.openSource}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

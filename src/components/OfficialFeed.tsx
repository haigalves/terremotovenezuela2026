"use client";

import { useCallback, useEffect, useState } from "react";
import type { OfficialFeedItem } from "@/lib/official-types";
import { t } from "@/lib/i18n";

function formatRelativeTime(iso: string) {
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
    return "bg-[var(--ve-red)] text-white";
  }
  return "bg-[var(--ve-yellow)] text-[var(--ve-blue-dark)]";
}

export interface OfficialFeedProps {
  onSelectEvent?: (item: OfficialFeedItem) => void;
  compact?: boolean;
}

export default function OfficialFeed({
  onSelectEvent,
  compact = false,
}: OfficialFeedProps) {
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
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--ve-yellow)]">
            {t.officialFeedTitle}
          </h2>
          <p className="text-[11px] text-white/70">{t.officialFeedSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="rounded border border-white/20 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/10"
          aria-label={t.refreshFeed}
        >
          ↻
        </button>
      </div>

      <div className="flex gap-1 border-b border-white/10 px-3 py-1.5 text-[10px]">
        <span
          className={`rounded px-1.5 py-0.5 ${sources.usgs ? "bg-[var(--ve-red)]/90 text-white" : "bg-white/10 text-white/50"}`}
        >
          USGS {sources.usgs ? "●" : "○"}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 ${sources.funvisis ? "bg-[var(--ve-yellow)] text-[var(--ve-blue-dark)]" : "bg-white/10 text-white/50"}`}
        >
          FUNVISIS {sources.funvisis ? "●" : "○"}
        </span>
        {lastUpdate && (
          <span className="ml-auto text-white/50">
            {formatRelativeTime(lastUpdate)}
          </span>
        )}
      </div>

      <div
        className={`overflow-y-auto ${compact ? "max-h-64" : "flex-1"}`}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && items.length === 0 ? (
          <p className="p-3 text-sm text-white/70">{t.loadingOfficial}</p>
        ) : items.length === 0 ? (
          <p className="p-3 text-sm text-white/70">{t.officialFeedEmpty}</p>
        ) : (
          <ul>
            {items.map((item) => {
              const isMajor = (item.magnitude ?? 0) >= 5;
              return (
                <li
                  key={item.id}
                  className={`border-b border-white/10 px-3 py-2.5 transition-colors hover:bg-white/5 ${
                    isMajor ? "border-l-4 border-l-[var(--ve-red)] bg-[var(--ve-red)]/10" : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <time
                      className="shrink-0 font-mono text-[11px] text-[var(--ve-yellow)]"
                      dateTime={item.time}
                    >
                      {formatRelativeTime(item.time)}
                    </time>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${sourceStyles(item.source)}`}
                    >
                      {item.source}
                    </span>
                    {item.magnitude != null && (
                      <span className="ml-auto shrink-0 font-bold text-white">
                        M{item.magnitude.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug text-white">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="mt-0.5 text-xs text-white/65">{item.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {item.lat != null && item.lng != null && onSelectEvent && (
                      <button
                        type="button"
                        onClick={() => onSelectEvent(item)}
                        className="font-medium text-[var(--ve-yellow)] underline hover:text-white"
                      >
                        {t.showOnMap}
                      </button>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-white/80 underline hover:text-white"
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

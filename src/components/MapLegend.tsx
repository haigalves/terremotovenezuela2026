"use client";

import { useTranslation } from "@/components/LocaleProvider";

/** Always-visible pin legend (replaces broken layer toggles). */
export default function MapLegend() {
  const { t } = useTranslation();

  const items = [
    { color: "bg-[var(--ve-red)]", label: t.legendOfficial },
    { color: "bg-[var(--ve-yellow)]", label: t.legendRequest },
    { color: "bg-[var(--ve-blue)] ring-1 ring-[var(--border)]", label: t.legendVideo },
  ] as const;

  return (
    <div
      className="map-legend pointer-events-none absolute bottom-[4.75rem] left-2 z-[400] flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm lg:bottom-3 lg:max-w-xs"
      aria-label={t.legend}
    >
      {items.map(({ color, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-700 sm:text-xs"
        >
          <span className={`inline-block size-2.5 shrink-0 rounded-full ${color}`} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

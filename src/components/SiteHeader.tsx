"use client";

import { CONTACT } from "@/lib/contact";
import { useTranslation } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

interface SiteHeaderProps {
  onOpenHowTo: () => void;
}

export default function SiteHeader({ onOpenHowTo }: SiteHeaderProps) {
  const { locale, t, setLocale } = useTranslation();

  function LangButton({ code, value }: { code: string; value: Locale }) {
    const active = locale === value;
    return (
      <button
        type="button"
        onClick={() => setLocale(value)}
        aria-pressed={active}
        aria-label={t.switchToLang(value)}
        className={`min-h-9 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          active
            ? "bg-[var(--ve-blue)] text-white"
            : "text-[var(--foreground-muted)] hover:bg-[var(--panel-bg)]"
        }`}
      >
        {code}
      </button>
    );
  }

  return (
    <header className="shrink-0 border-b border-[var(--border)] bg-white shadow-sm">
      <div className="ve-tricolor" aria-hidden />
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight text-[var(--ve-blue)] sm:text-xl">
            {t.headerTitle}
          </h1>
          <p className="truncate text-xs text-[var(--foreground-muted)] sm:text-sm">
            {t.headerSubtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenHowTo}
            className="min-h-9 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--ve-blue)] active:bg-[var(--ve-blue-soft)] sm:px-3"
          >
            {t.howToButton}
          </button>
          <div
            className="flex rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-0.5"
            role="group"
            aria-label="Language"
          >
            <LangButton code={t.langEs} value="es" />
            <LangButton code={t.langEn} value="en" />
          </div>
        </div>
      </div>

      <p
        className="hidden border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--foreground-muted)] sm:block"
        role="note"
      >
        {t.disclaimer}
      </p>

      <div className="hidden flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-[var(--border)] px-4 py-1.5 text-xs lg:flex">
        <a
          href={`mailto:${CONTACT.email}`}
          className="text-[var(--foreground-muted)] underline hover:text-[var(--ve-blue)]"
        >
          {CONTACT.email}
        </a>
        <a
          href={CONTACT.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--foreground-muted)] underline hover:text-[var(--ve-blue)]"
        >
          {CONTACT.twitterHandle}
        </a>
        <a
          href={CONTACT.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--foreground-muted)] underline hover:text-[var(--ve-blue)]"
        >
          {CONTACT.instagramHandle}
        </a>
      </div>
    </header>
  );
}

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
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
    <header className="border-b border-[var(--border)] bg-white shadow-sm">
      <div className="ve-tricolor" aria-hidden />
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-[var(--ve-blue)] sm:text-2xl">
            {t.headerTitle}
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">{t.headerSubtitle}</p>
          <p className="mt-2 max-w-2xl text-xs text-[var(--foreground-muted)] sm:text-sm" role="note">
            {t.disclaimer}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onOpenHowTo}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ve-blue)] hover:bg-[var(--ve-blue-soft)]"
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

          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
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
        </div>
      </div>
    </header>
  );
}

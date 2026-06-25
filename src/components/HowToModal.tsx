"use client";

import { CONTACT } from "@/lib/contact";
import { useTranslation } from "@/components/LocaleProvider";

interface HowToModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HowToModal({ open, onClose }: HowToModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ve-tricolor rounded-t-xl" aria-hidden />
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 id="howto-title" className="text-lg font-semibold text-[var(--ve-blue)]">
            {t.howToTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--foreground-muted)] hover:bg-[var(--panel-bg)]"
            aria-label={t.close}
          >
            {t.close}
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <p className="text-sm leading-relaxed text-slate-700">{t.howToIntro}</p>

          <ol className="space-y-3">
            {t.howToSteps.map((step) => (
              <li
                key={step.title}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] p-3"
              >
                <h3 className="text-sm font-semibold text-[var(--ve-blue)]">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <section className="rounded-lg border border-[var(--border)] p-3">
            <h3 className="text-sm font-semibold text-[var(--ve-blue)]">
              {t.howToContactTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{t.howToContactNote}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <span className="font-medium text-slate-700">{t.contactEmail}: </span>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-[var(--ve-blue)] underline"
                >
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <span className="font-medium text-slate-700">{t.contactTwitter}: </span>
                <a
                  href={CONTACT.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ve-blue)] underline"
                >
                  {CONTACT.twitterHandle}
                </a>
              </li>
              <li>
                <span className="font-medium text-slate-700">{t.contactInstagram}: </span>
                <a
                  href={CONTACT.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ve-blue)] underline"
                >
                  {CONTACT.instagramHandle}
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

import { COMANDO_LINKS } from "@/lib/site-closed";

export default function ClosedSite() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center">
      <div className="w-full max-w-lg">
        <div
          className="mx-auto mb-6 flex h-1 w-24 overflow-hidden rounded-full"
          aria-hidden
        >
          <span className="flex-1 bg-[var(--ve-yellow)]" />
          <span className="flex-1 bg-[var(--ve-blue)]" />
          <span className="flex-1 bg-[var(--ve-red)]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[var(--ve-blue)] sm:text-3xl">
          Sitio cerrado
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
          Este mapa de ayuda ha dejado de operar. La información aquí ya no se
          actualiza ni se muestra.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
          Para información más confiable y actualizada sobre la emergencia,
          consulte{" "}
          <strong className="font-semibold text-slate-800">Comando Con Vzla</strong>.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {COMANDO_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--ve-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163366]"
            >
              {label}
            </a>
          ))}
        </div>

        <hr className="my-10 border-[var(--border)]" />

        <h2 className="text-lg font-semibold text-slate-800">Site closed</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">
          This relief map is no longer active. Data is no longer displayed or
          collected here. For better, up-to-date information, please follow{" "}
          <strong className="font-semibold text-slate-700">Comando Con Vzla</strong>.
        </p>
      </div>
    </main>
  );
}

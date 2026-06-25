import { NextResponse } from "next/server";

/** Set to true to show the closure page and disable all public data/API access. */
export const SITE_CLOSED = true;

export const COMANDO_LINKS = [
  {
    label: "Comando Con Vzla en X",
    href: "https://x.com/ConVzlaComando",
  },
  {
    label: "Comando Con Vzla en Instagram",
    href: "https://www.instagram.com/convzlacomando/",
  },
] as const;

export function siteClosedResponse() {
  if (!SITE_CLOSED) return null;
  return NextResponse.json(
    {
      closed: true,
      error:
        "Este sitio ha sido cerrado. Consulte Comando Con Vzla para información actualizada.",
      errorEn:
        "This site has been closed. Please check Comando Con Vzla for up-to-date information.",
    },
    { status: 410 },
  );
}

export function isSiteClosed() {
  return SITE_CLOSED;
}

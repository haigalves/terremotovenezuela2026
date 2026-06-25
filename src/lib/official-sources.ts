import type { OfficialFeedItem } from "./official-types";

const USGS_QUERY =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-06-20&minlatitude=0&maxlatitude=13&minlongitude=-74&maxlongitude=-59&orderby=time&limit=25";

const FUNVISIS_NEWS = "https://www.funvisis.gob.ve/noticias.php";
const FUNVISIS_MONITOR = "https://www.funvisis.gob.ve/monitor.html";

interface UsgsFeature {
  id: string;
  geometry?: { coordinates?: [number, number, number] };
  properties?: {
    mag?: number | null;
    place?: string;
    time?: number;
    url?: string;
    title?: string;
    alert?: string | null;
    status?: string;
  };
}

export async function fetchUsgsEvents(): Promise<OfficialFeedItem[]> {
  const res = await fetch(USGS_QUERY, {
    headers: { Accept: "application/json" },
    next: { revalidate: 120 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { features?: UsgsFeature[] };
  const features = data.features ?? [];

  return features.map((feature) => {
    const props = feature.properties ?? {};
    const [lng, lat, depth] = feature.geometry?.coordinates ?? [null, null, null];

    return {
      id: `usgs-${feature.id}`,
      source: "USGS" as const,
      title: props.title ?? `M ${props.mag ?? "?"} — ${props.place ?? "Venezuela"}`,
      summary: props.place ?? null,
      time: props.time ? new Date(props.time).toISOString() : new Date().toISOString(),
      url: props.url ?? "https://earthquake.usgs.gov/",
      magnitude: typeof props.mag === "number" ? props.mag : null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      depthKm: typeof depth === "number" ? depth : null,
      place: props.place ?? null,
      alert: props.alert ?? null,
    };
  });
}

function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchFunvisisNews(): Promise<OfficialFeedItem[]> {
  try {
    const res = await fetch(FUNVISIS_NEWS, {
      headers: {
        Accept: "text/html",
        "User-Agent": "terremotovenezuela2026/1.0 (relief map)",
      },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const items: OfficialFeedItem[] = [];
    const headingRegex =
      /<h4[^>]*>\s*([^<]*(?:[Ss]ismo|sísm|temblor)[^<]*)\s*<\/h4>/gi;

    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = headingRegex.exec(html)) !== null && index < 12) {
      const rawTitle = decodeHtml(match[1]);
      if (!rawTitle) continue;

      const magMatch = rawTitle.match(/(\d+[,.]\d+)/);
      const magnitude = magMatch
        ? Number.parseFloat(magMatch[1].replace(",", "."))
        : null;

      items.push({
        id: `funvisis-news-${index}`,
        source: "FUNVISIS",
        title: rawTitle,
        summary: "Reporte institucional FUNVISIS",
        time: new Date(Date.now() - index * 3_600_000).toISOString(),
        url: FUNVISIS_NEWS,
        magnitude: Number.isFinite(magnitude) ? magnitude : null,
        lat: null,
        lng: null,
        depthKm: null,
        place: null,
        alert: null,
      });
      index += 1;
    }

    if (items.length === 0) {
      items.push({
        id: "funvisis-monitor",
        source: "FUNVISIS",
        title: "Monitor de sismos FUNVISIS",
        summary: "Consulte el monitor oficial de la Fundación Venezolana de Investigaciones Sismológicas.",
        time: new Date().toISOString(),
        url: FUNVISIS_MONITOR,
        magnitude: null,
        lat: null,
        lng: null,
        depthKm: null,
        place: null,
        alert: null,
      });
    }

    return items;
  } catch {
    return [
      {
        id: "funvisis-fallback",
        source: "FUNVISIS",
        title: "FUNVISIS — fuente oficial Venezuela",
        summary:
          "No se pudo cargar el feed en este momento. Visite el monitor oficial.",
        time: new Date().toISOString(),
        url: FUNVISIS_MONITOR,
        magnitude: null,
        lat: null,
        lng: null,
        depthKm: null,
        place: null,
        alert: null,
      },
    ];
  }
}

export async function fetchOfficialFeed(): Promise<{
  items: OfficialFeedItem[];
  sources: { usgs: boolean; funvisis: boolean };
}> {
  const [usgs, funvisis] = await Promise.all([
    fetchUsgsEvents().catch(() => [] as OfficialFeedItem[]),
    fetchFunvisisNews().catch(() => [] as OfficialFeedItem[]),
  ]);

  const merged = [...usgs, ...funvisis].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );

  return {
    items: merged,
    sources: {
      usgs: usgs.length > 0,
      funvisis: funvisis.length > 0,
    },
  };
}

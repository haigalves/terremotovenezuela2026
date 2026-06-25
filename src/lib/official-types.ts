export type OfficialSource = "USGS" | "FUNVISIS";

export interface OfficialFeedItem {
  id: string;
  source: OfficialSource;
  title: string;
  summary: string | null;
  time: string;
  url: string;
  magnitude: number | null;
  lat: number | null;
  lng: number | null;
  depthKm: number | null;
  place: string | null;
  alert: string | null;
}

export interface OfficialFeedResponse {
  items: OfficialFeedItem[];
  fetchedAt: string;
  sources: {
    usgs: boolean;
    funvisis: boolean;
  };
}

export type CheckRequestStatus =
  | "pending"
  | "being_checked"
  | "found"
  | "not_found";

export type SituationType =
  | "damage"
  | "rescue"
  | "evacuation"
  | "infrastructure"
  | "other";

export interface CheckRequest {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  person_name: string;
  last_seen_area: string;
  description: string | null;
  contact_info: string;
  status: CheckRequestStatus;
  approved: boolean;
}

export interface VerifiedSituation {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  area_name: string;
  title: string;
  description: string | null;
  video_url: string;
  source_url: string | null;
  situation_type: SituationType;
  approved: boolean;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  kind: "request" | "video";
}

export type LayerVisibility = {
  requests: boolean;
  videos: boolean;
  official: boolean;
};

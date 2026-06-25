import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SituationType, VerifiedSituation } from "@/lib/types";

const VALID_TYPES: SituationType[] = [
  "damage",
  "rescue",
  "evacuation",
  "infrastructure",
  "other",
];

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      data: [] as VerifiedSituation[],
      configured: false,
      error: isSupabaseConfigured()
        ? "Invalid Supabase configuration"
        : "Database not configured",
    });
  }

  const { data, error } = await supabase
    .from("verified_situations")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data as VerifiedSituation[],
    configured: true,
  });
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      {
        error: isSupabaseConfigured()
          ? "Invalid Supabase URL or API key on server"
          : "Database not configured",
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    lat,
    lng,
    area_name,
    title,
    description,
    video_url,
    source_url,
    situation_type = "damage",
  } = body;

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (
    typeof area_name !== "string" ||
    area_name.trim().length < 2 ||
    typeof title !== "string" ||
    title.trim().length < 3 ||
    typeof video_url !== "string" ||
    !isValidUrl(video_url.trim())
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  if (
    typeof situation_type !== "string" ||
    !VALID_TYPES.includes(situation_type as SituationType)
  ) {
    return NextResponse.json({ error: "Invalid situation type" }, { status: 400 });
  }

  if (
    source_url !== undefined &&
    source_url !== null &&
    source_url !== "" &&
    (typeof source_url !== "string" || !isValidUrl(source_url.trim()))
  ) {
    return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
  }

  const { error } = await supabase.from("verified_situations").insert({
    lat,
    lng,
    area_name: area_name.trim(),
    title: title.trim(),
    description:
      typeof description === "string" ? description.trim() || null : null,
    video_url: video_url.trim(),
    source_url:
      typeof source_url === "string" && source_url.trim()
        ? source_url.trim()
        : null,
    situation_type,
    approved: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

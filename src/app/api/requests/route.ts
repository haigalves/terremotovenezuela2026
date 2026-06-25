import { NextResponse } from "next/server";
import { siteClosedResponse } from "@/lib/site-closed";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { CheckRequest, CheckRequestStatus } from "@/lib/types";

const VALID_STATUSES: CheckRequestStatus[] = [
  "pending",
  "being_checked",
  "found",
  "not_found",
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

export async function GET() {
  const closed = siteClosedResponse();
  if (closed) return closed;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      data: [] as CheckRequest[],
      configured: false,
      error: isSupabaseConfigured()
        ? "Invalid Supabase configuration"
        : "Database not configured",
    });
  }

  const { data, error } = await supabase
    .from("check_requests")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data as CheckRequest[],
    configured: true,
  });
}

export async function POST(request: Request) {
  const closed = siteClosedResponse();
  if (closed) return closed;

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
    person_name,
    last_seen_area,
    description,
    contact_info,
    status = "pending",
  } = body;

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  if (
    typeof person_name !== "string" ||
    person_name.trim().length < 2 ||
    typeof last_seen_area !== "string" ||
    last_seen_area.trim().length < 2 ||
    typeof contact_info !== "string" ||
    contact_info.trim().length < 3
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as CheckRequestStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase.from("check_requests").insert({
    lat,
    lng,
    person_name: person_name.trim(),
    last_seen_area: last_seen_area.trim(),
    description:
      typeof description === "string" ? description.trim() || null : null,
    contact_info: contact_info.trim(),
    status,
    approved: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

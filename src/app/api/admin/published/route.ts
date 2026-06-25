import { NextResponse } from "next/server";
import { siteClosedResponse } from "@/lib/site-closed";
import { verifyAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { CheckRequest, VerifiedSituation } from "@/lib/types";

export async function GET(request: Request) {
  const closed = siteClosedResponse();
  if (closed) return closed;

  const authError = verifyAdmin(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Admin database not configured" },
      { status: 503 },
    );
  }

  const [requestsRes, videosRes] = await Promise.all([
    supabase
      .from("check_requests")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("verified_situations")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (requestsRes.error || videosRes.error) {
    return NextResponse.json(
      {
        error:
          requestsRes.error?.message ??
          videosRes.error?.message ??
          "Query failed",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    requests: (requestsRes.data ?? []) as CheckRequest[],
    videos: (videosRes.data ?? []) as VerifiedSituation[],
  });
}

import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase";

type ItemType = "request" | "video";

export async function PATCH(request: Request) {
  const authError = verifyAdmin(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Admin database not configured" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, id, approved } = body;

  if (type !== "request" && type !== "video") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (typeof approved !== "boolean") {
    return NextResponse.json({ error: "approved must be boolean" }, { status: 400 });
  }

  const table = type === "request" ? "check_requests" : "verified_situations";

  if (approved) {
    const { data, error } = await supabase
      .from(table)
      .update({ approved: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

import { NextResponse } from "next/server";
import { fetchOfficialFeed } from "@/lib/official-sources";
import type { OfficialFeedResponse } from "@/lib/official-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { items, sources } = await fetchOfficialFeed();

    const body: OfficialFeedResponse = {
      items,
      fetchedAt: new Date().toISOString(),
      sources,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      {
        items: [],
        fetchedAt: new Date().toISOString(),
        sources: { usgs: false, funvisis: false },
      } satisfies OfficialFeedResponse,
      { status: 500 },
    );
  }
}

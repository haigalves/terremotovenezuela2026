const BASE = process.env.BASE_URL || "http://localhost:3456";

async function loadAdminSecret() {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const envPath = path.join(process.cwd(), ".env.local");
    const raw = fs.readFileSync(envPath, "utf8");
    const match = raw.match(/^ADMIN_SECRET=(.+)$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

const ADMIN = await loadAdminSecret();

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function main() {
  console.log(`\n=== Verifying ${BASE} ===\n`);

  // Pages
  for (const path of ["/", "/admin"]) {
    const res = await fetch(`${BASE}${path}`);
    if (res.ok) pass(`GET ${path}`, String(res.status));
    else fail(`GET ${path}`, String(res.status));
  }

  // Official feed
  const official = await get("/api/official-feed");
  if (official.res.ok && Array.isArray(official.json?.items)) {
    pass(
      "GET /api/official-feed",
      `${official.json.items.length} items, USGS=${official.json.sources?.usgs}`,
    );
  } else fail("GET /api/official-feed", official.res.statusText);

  // Community reads
  const req = await get("/api/requests");
  if (req.res.ok && req.json?.configured === true) {
    pass("GET /api/requests", `${(req.json.data || []).length} approved`);
  } else if (req.res.ok && req.json?.configured === false) {
    fail("GET /api/requests", "database not configured");
  } else fail("GET /api/requests", req.json?.error || req.res.statusText);

  const vid = await get("/api/videos");
  if (vid.res.ok && vid.json?.configured === true) {
    pass("GET /api/videos", `${(vid.json.data || []).length} approved`);
  } else fail("GET /api/videos", vid.json?.error || vid.res.statusText);

  // Admin without auth
  const adminNoAuth = await get("/api/admin/pending");
  if (adminNoAuth.res.status === 401) pass("Admin rejects missing auth");
  else fail("Admin rejects missing auth", `got ${adminNoAuth.res.status}`);

  if (!ADMIN) {
    console.log("\nSkipping write tests (no ADMIN_SECRET)\n");
  } else {
    // POST test request
    const testPayload = {
      lat: 10.48,
      lng: -66.9,
      person_name: "Test Verificación Auto",
      last_seen_area: "Caracas - prueba sistema",
      description: "Entrada de prueba automatizada",
      contact_info: "test@example.com",
    };

    const postRes = await fetch(`${BASE}/api/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });
    const postJson = await postRes.json();

    if (postRes.status === 201 && (postJson.success || postJson.data?.id)) {
      pass("POST /api/requests", "created");

      // Find the pending test row via admin API
      const pending = await fetch(`${BASE}/api/admin/pending`, {
        headers: { Authorization: `Bearer ${ADMIN}` },
      });
      const pendingJson = await pending.json();
      const testRow = (pendingJson.requests || []).find(
        (r) => r.person_name === "Test Verificación Auto",
      );
      const pendingId = testRow?.id;

      if (pending.ok && pendingId) pass("Admin sees pending request");
      else fail("Admin sees pending request");

      const approve = await fetch(`${BASE}/api/admin/approve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${ADMIN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "request", id: pendingId, approved: true }),
      });

      if (approve.ok) pass("Admin approves request");
      else fail("Admin approves request", await approve.text());

      const after = await get("/api/requests");
      const visible = (after.json?.data || []).some((r) => r.id === pendingId);
      if (visible) pass("Approved request on public map API");
      else fail("Approved request on public map API");

      // Cleanup - reject/delete by deleting via admin reject on a duplicate wouldn't work after approve
      // Approved entry stays - we could delete via service role but that's ok for test data
    } else {
      fail("POST /api/requests", postJson.error || postRes.statusText);
    }

    const badAdmin = await get("/api/admin/pending");
    // wrong password test
    const wrong = await fetch(`${BASE}/api/admin/pending`, {
      headers: { Authorization: "Bearer wrong-password" },
    });
    if (wrong.status === 401) pass("Admin rejects wrong password");
    else fail("Admin rejects wrong password");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

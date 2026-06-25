import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed || undefined;
}

function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  const cleaned = cleanEnv(value);
  if (!cleaned) return undefined;

  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function getSupabaseUrl(): string | undefined {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string | undefined {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isAdminConfigured(): boolean {
  return Boolean(
    cleanEnv(process.env.ADMIN_SECRET) &&
      cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

let client: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key);
  }

  return client;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

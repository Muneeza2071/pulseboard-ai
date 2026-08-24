import { createClient } from "@supabase/supabase-js";

function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("PulseBoard Supabase public configuration is missing.");
  return { url, key };
}

export function createSupabaseUserClient(accessToken: string) {
  const { url, key } = publicConfig();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseAdminClient() {
  const { url } = publicConfig();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) throw new Error("PulseBoard server database credential is not configured.");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

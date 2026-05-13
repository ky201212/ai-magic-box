import "server-only";
import { createClient } from "@supabase/supabase-js";

let cachedSupabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cachedSupabaseAdmin) {
    return cachedSupabaseAdmin;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("缺少 SUPABASE_URL 环境变量。");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量。");
  }

  cachedSupabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabaseAdmin;
}

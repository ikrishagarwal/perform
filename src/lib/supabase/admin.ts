import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Admin Supabase client using the SERVICE ROLE key.
 * 
 * **WARNING**: This client BYPASSES all Row-Level Security (RLS) policies.
 * It should ONLY be used in secure Server Actions or Route Handlers where
 * systemic operations (like cascading shared goals or data migrations) 
 * are required. Never expose this to the browser or use it for standard user CRUD.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

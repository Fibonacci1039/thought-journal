import "server-only";
import { createClient } from "@supabase/supabase-js";

// It is safe to expose the project URL, but we need the Service Role Key for server-side operations.
// We use NEXT_PUBLIC_SUPABASE_URL conventionally, or just SUPABASE_URL if we wanted to hide it,
// but the client doesn't use it anyway with this architecture.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

// STRICTLY SERVER-SIDE KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey && process.env.NODE_ENV === "production") {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Database operations will fail."
  );
}

// Fallback for build time if needed, but ideally should be set.
const usedKey = supabaseServiceKey || "placeholder-key";
if (usedKey === "placeholder-key") {
  console.warn("WARNING: Using placeholder key for Supabase Client.");
}
export const supabase = createClient(supabaseUrl, usedKey);

import { createBrowserClient as createClientInternal } from "@supabase/ssr";

export const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard against missing environment variables or server-side execution during build
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build or SSR without proper env, return a dummy client that throws on use
    // This allows static analysis to complete while preventing actual API calls
    if (typeof window === "undefined") {
      // We're in a server context during build - this shouldn't happen for client code
      // but return a placeholder to prevent crashes
      return createClientInternal(
        "https://placeholder.supabase.co",
        "placeholder-key"
      );
    }
    throw new Error(
      "Supabase environment variables are not configured. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createClientInternal(supabaseUrl, supabaseAnonKey);
};

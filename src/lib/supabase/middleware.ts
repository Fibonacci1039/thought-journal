import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard against missing environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase environment variables not configured, skipping auth"
    );
    return supabaseResponse;
  }

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update request cookies for the current request
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        // Create a new response with the updated cookies
        supabaseResponse = NextResponse.next({
          request,
        });

        // Update response cookies for the client
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection
  // Note: Add logic here to skip check for public assets or api routes if needed
  // Current protected routes: All except /login, /auth/*, /pricing logic if any.
  // We'll protect everything by default for now except auth routes.

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/_next") && // Next.js internals
    !request.nextUrl.pathname.includes(".") // Static files (extensions)
  ) {
    // If no user and trying to access protected route, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Stamps the current pathname onto every request as `x-pathname` so that
 * server components can read it via `headers()` without a client-side router.
 *
 * Used by the main layout to skip right-panel DB fetches on routes where the
 * sidebar is hidden (e.g. /messages, /group-chats).
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Run on all app routes except Next.js internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

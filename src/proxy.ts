import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const redirectPaths = new Set([
    "/admin/pages",
    "/admin/site-content",
    "/admin/footer",
  ]);

  if (redirectPaths.has(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/content";
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return updateSession(request, requestHeaders);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

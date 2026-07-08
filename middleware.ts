import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/admin/pages" ||
    request.nextUrl.pathname === "/admin/site-content" ||
    request.nextUrl.pathname === "/admin/footer"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/content";
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

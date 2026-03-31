
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // Skip admin, API, and static assets
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/lp") ||
    url.pathname.startsWith("/popup") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // No subdomain rewrite on localhost
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  if (isLocalhost) return NextResponse.next();

  // Production subdomain detection: "membership.bizcivitas.com" → subdomain = "membership"
  const parts = hostname.split(".");
  if (parts.length > 2 && parts[0] !== "www") {
    const subdomain = parts[0];
    url.pathname = `/lp/${subdomain}`;
    url.searchParams.set("_subdomain", "1");
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

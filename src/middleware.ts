import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("pm_admin_token")?.value;

    if (!token) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Guard /admin/users — super admin only
    // Decode JWT payload without crypto (edge-safe: just read the base64 claims)
    if (pathname.startsWith("/admin/users")) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role !== "pm-admin") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      } catch {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

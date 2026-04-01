import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pm-admin-secret-key";
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("pm_admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;

    // For sub-admins, fetch fresh permissions from DB so permission changes
    // take effect immediately without requiring re-login
    if (decoded.role === "pm-subadmin" && decoded.userId) {
      try {
        const res = await fetch(`${BACKEND_URL}/pm/admin-users/${decoded.userId}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const { data: freshUser } = await res.json();
          const user = {
            ...decoded,
            permissions: freshUser.permissions ?? decoded.permissions,
            dashboardWidgets: freshUser.dashboardWidgets ?? decoded.dashboardWidgets ?? null,
            isActive: freshUser.isActive,
          };
          if (!user.isActive) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
          }
          return NextResponse.json({ authenticated: true, user }, { status: 200 });
        }
      } catch {
        // Fall through to return JWT-based permissions if backend is unreachable
      }
    }

    return NextResponse.json(
      { authenticated: true, user: decoded },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

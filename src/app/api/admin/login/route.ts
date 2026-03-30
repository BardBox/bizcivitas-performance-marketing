import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bizcivitas.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "pm-admin-secret-key";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8090";

function setCookie(response: NextResponse, token: string) {
  response.cookies.set("pm_admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Super admin — validated against env vars
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { email, role: "pm-admin", permissions: null },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      const response = NextResponse.json({ message: "Login successful", token }, { status: 200 });
      setCookie(response, token);
      return response;
    }

    // 2. Sub-admin — validated against database via backend
    let backendRes: Response;
    try {
      backendRes = await fetch(`${BACKEND_URL}/pm/admin-users/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (!backendRes.ok) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const { user } = await backendRes.json();

    const token = jwt.sign(
      {
        email: user.email,
        name: user.name,
        role: "pm-subadmin",
        userId: user._id,
        permissions: user.permissions,
        dashboardWidgets: user.dashboardWidgets ?? null,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({ message: "Login successful", token }, { status: 200 });
    setCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pm-admin-secret-key";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("pm_admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);
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

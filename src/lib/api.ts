// Normalize API base URL - strips trailing /api/v1 if present so we can append it ourselves
const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export const API_BASE_URL = raw.replace(/\/api\/v1\/?$/, "");

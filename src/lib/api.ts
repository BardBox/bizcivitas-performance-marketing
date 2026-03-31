export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pm-backend-7tbf.onrender.com" ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");

// NOTE: If this URL is missing/incorrect in deployment, PM form submit and tracking calls can return 401/404.


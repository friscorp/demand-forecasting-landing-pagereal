// API configuration that supports both Vite and Next.js environment variables
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"

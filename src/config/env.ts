export const env = {
  FRAPPE_URL:
    process.env.NEXT_PUBLIC_FRAPPE_URL || "http://localhost:8000",
} as const;

export function getSafeCallbackUrl(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

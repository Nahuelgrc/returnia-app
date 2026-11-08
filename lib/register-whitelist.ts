export function isEmailWhitelistedForRegistration(email: string) {
  const raw = process.env.REGISTER_WHITELIST_EMAILS;
  if (!raw) return false;

  const whitelist = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return whitelist.includes(email.toLowerCase());
}

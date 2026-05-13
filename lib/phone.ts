import "server-only";

export function normalizeChinaPhone(input: string) {
  const normalized = input.replace(/\s+/g, "").replace(/-/g, "");

  if (/^1\d{10}$/.test(normalized)) {
    return normalized;
  }

  if (/^\+?86(1\d{10})$/.test(normalized)) {
    return normalized.replace(/^\+?86/, "");
  }

  return null;
}

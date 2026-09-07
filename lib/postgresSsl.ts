const LEGACY_SECURE_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePgSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);

    if (url.searchParams.get("uselibpqcompat") === "true") {
      return connectionString;
    }

    const sslMode = url.searchParams.get("sslmode");

    if (!sslMode || !LEGACY_SECURE_SSL_MODES.has(sslMode)) {
      return connectionString;
    }

    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  } catch {
    return connectionString;
  }
}

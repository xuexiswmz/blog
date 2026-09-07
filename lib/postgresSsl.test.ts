import { describe, expect, it } from "vitest";
import { normalizePgSslMode } from "./postgresSsl";

describe("normalizePgSslMode", () => {
  it.each(["prefer", "require", "verify-ca"])(
    "preserves pg's current secure behavior for sslmode=%s",
    (sslMode) => {
      expect(
        normalizePgSslMode(
          `postgresql://user:password@db.example.com/blog?sslmode=${sslMode}`,
        ),
      ).toBe(
        "postgresql://user:password@db.example.com/blog?sslmode=verify-full",
      );
    },
  );

  it("preserves an explicit libpq compatibility choice", () => {
    const connectionString =
      "postgresql://user:password@db.example.com/blog?uselibpqcompat=true&sslmode=require";

    expect(normalizePgSslMode(connectionString)).toBe(connectionString);
  });

  it("leaves verify-full and non-URL values unchanged", () => {
    const secureUrl =
      "postgresql://user:password@db.example.com/blog?sslmode=verify-full";

    expect(normalizePgSslMode(secureUrl)).toBe(secureUrl);
    expect(normalizePgSslMode("not-a-postgres-url")).toBe(
      "not-a-postgres-url",
    );
  });
});

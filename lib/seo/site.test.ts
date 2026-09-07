import { describe, expect, it } from "vitest";
import { normalizeSiteUrl, resolveSiteUrl } from "./site";

describe("normalizeSiteUrl", () => {
  it("removes trailing slashes from an absolute site URL", () => {
    expect(normalizeSiteUrl("https://blog.example.com///")).toBe(
      "https://blog.example.com",
    );
  });

  it("adds HTTPS when a deployment hostname has no protocol", () => {
    expect(normalizeSiteUrl("blog.example.com")).toBe(
      "https://blog.example.com",
    );
  });

  it("uses localhost only outside production when no URL is configured", () => {
    expect(resolveSiteUrl(undefined, "development")).toBe(
      "http://localhost:3000",
    );
    expect(() => resolveSiteUrl(undefined, "production")).toThrow(
      "生产环境缺少站点地址",
    );
  });
});

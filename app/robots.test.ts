import { describe, expect, it } from "vitest";
import { buildRobots } from "./robots";

describe("buildRobots", () => {
  it("allows public pages while excluding admin and API routes", () => {
    expect(buildRobots("https://blog.example.com")).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
      sitemap: "https://blog.example.com/sitemap.xml",
      host: "https://blog.example.com",
    });
  });
});

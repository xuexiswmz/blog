import { describe, expect, it } from "vitest";
import { metadata } from "./layout";

describe("admin metadata", () => {
  it("prevents search engines from indexing or following admin pages", () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});

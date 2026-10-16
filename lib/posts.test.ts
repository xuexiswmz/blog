import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystem = vi.hoisted(() => ({
  access: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => fileSystem);

import { getPostSummaries, postExists } from "./posts";

describe("post metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sorts equal-date articles by slug after sorting dates descending", async () => {
    fileSystem.readdir.mockResolvedValue([
      "z-later.mdx",
      "b-tied.mdx",
      "a-tied.mdx",
    ]);
    fileSystem.readFile.mockImplementation(async (filePath: string) => {
      const slug = filePath.split("/").at(-1)?.replace(".mdx", "");
      const date = slug === "z-later" ? "2026-10-02" : "2026-10-01";
      return `---\ntitle: ${slug}\ndate: "${date}"\n---\n`;
    });

    const summaries = await getPostSummaries();

    expect(summaries.map((post) => post.slug)).toEqual([
      "z-later",
      "a-tied",
      "b-tied",
    ]);
  });

  it("reports whether the article file is accessible", async () => {
    fileSystem.access
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("missing"));

    await expect(postExists("present")).resolves.toBe(true);
    await expect(postExists("missing")).resolves.toBe(false);
  });
});

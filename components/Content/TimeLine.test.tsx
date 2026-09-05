import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/posts", () => ({
  getPostArchives: vi.fn().mockResolvedValue([
    {
      year: "2026",
      posts: [
        {
          slug: "responsive-layout",
          title: "Responsive layout",
          date: "2026-09-05",
          description: "A compact archive row",
          tags: ["CSS"],
        },
      ],
    },
  ]),
}));

vi.mock("@/lib/likes", () => ({
  getLikeSummaries: vi.fn().mockResolvedValue(
    new Map([
      ["responsive-layout", { count: 3, liked: false }],
    ]),
  ),
}));

vi.mock("@/lib/visitor", () => ({
  readVisitorID: vi.fn().mockResolvedValue(null),
}));

vi.mock("./TimelineEntrance", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

import TimeLine from "./TimeLine";

describe("TimeLine layout", () => {
  it("renders articles as compact horizontal archive rows", async () => {
    const markup = renderToStaticMarkup(await TimeLine());

    expect(markup).toContain(
      "timeline-entry flex min-w-0 items-center gap-3 py-3",
    );
    expect(markup).toContain("line-clamp-1");
    expect(markup).not.toContain("py-5");
  });

  it("keeps the like action inline with each archive row", async () => {
    const markup = renderToStaticMarkup(await TimeLine());

    expect(markup).toContain("shrink-0");
    expect(markup).not.toContain("mt-3 inline-flex");
    expect(markup).toContain(">3</span>");
  });

  it("renders the timeline panel without an outer border", async () => {
    const markup = renderToStaticMarkup(await TimeLine());

    expect(markup).not.toContain("border-slate-200/90");
    expect(markup).not.toContain("dark:border-white/10");
  });

  it("matches the page background in dark mode", async () => {
    const markup = renderToStaticMarkup(await TimeLine());

    expect(markup).toContain("dark:bg-background");
    expect(markup).not.toContain("dark:bg-[#0d1117]/55");
  });
});

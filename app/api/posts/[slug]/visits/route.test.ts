import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getOrCreateVisitorId,
  postExists,
  recordArticleVisit,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrCreateVisitorId: vi.fn(),
  postExists: vi.fn(),
  recordArticleVisit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));
vi.mock("@/lib/visitor", () => ({ getOrCreateVisitorId }));
vi.mock("@/lib/posts", () => ({ postExists }));
vi.mock("@/lib/analytics/repositories/articleVisitRepository", () => ({
  recordArticleVisit,
}));

import { POST } from "./route";

describe("POST /api/posts/[slug]/visits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue(null);
    postExists.mockResolvedValue(true);
    getOrCreateVisitorId.mockResolvedValue(
      "11111111-1111-4111-8111-111111111111",
    );
    recordArticleVisit.mockResolvedValue(true);
  });

  it("records a valid anonymous article visit", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "css-grid" }),
    });

    expect(response.status).toBe(204);
    expect(recordArticleVisit).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "css-grid",
    );
  });

  it("does not record administrator visits", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "css-grid" }),
    });

    expect(response.status).toBe(204);
    expect(recordArticleVisit).not.toHaveBeenCalled();
  });

  it("rejects malformed slugs", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "../secret" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing article", async () => {
    postExists.mockResolvedValue(false);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "missing-post" }),
    });

    expect(response.status).toBe(404);
  });
});

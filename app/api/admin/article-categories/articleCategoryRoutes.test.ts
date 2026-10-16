import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getArticleCategoryAdminState: vi.fn(),
  createArticleCategory: vi.fn(),
  renameArticleCategory: vi.fn(),
  deleteArticleCategory: vi.fn(),
  moveArticleCategory: vi.fn(),
  assignArticleToCategory: vi.fn(),
  moveArticleInCategory: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/lib/articleCategories/services/articleCategoryService", () => ({
  ...mocks,
}));

import { GET, POST } from "./route";
import { DELETE, PATCH as PATCH_CATEGORY } from "./[categoryId]/route";
import {
  PATCH as PATCH_ASSIGNMENT,
  PUT,
} from "./assignments/[slug]/route";

const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const categoryContext = {
  params: Promise.resolve({ categoryId: CATEGORY_ID }),
};
const assignmentContext = {
  params: Promise.resolve({ slug: "react%2Dhooks" }),
};

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin article category routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ user: { id: "admin" } });
    mocks.getArticleCategoryAdminState.mockResolvedValue({
      categories: [],
      unassignedPosts: [],
    });
  });

  it("rejects unauthenticated requests for every route family", async () => {
    mocks.getSession.mockResolvedValue(null);

    const responses = await Promise.all([
      GET(new Request("http://localhost/api/admin/article-categories")),
      PATCH_CATEGORY(
        jsonRequest("http://localhost/category", "PATCH", { name: "React" }),
        categoryContext,
      ),
      PUT(
        jsonRequest("http://localhost/assignment", "PUT", {
          categoryId: CATEGORY_ID,
        }),
        assignmentContext,
      ),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({
        message: "请先登录管理员账号",
      });
    }
  });

  it("returns the current admin state without caching", async () => {
    const state = { categories: [], unassignedPosts: [] };
    mocks.getArticleCategoryAdminState.mockResolvedValue(state);

    const response = await GET(
      new Request("http://localhost/api/admin/article-categories"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(state);
  });

  it("rejects malformed and empty category creation bodies", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/admin/article-categories", {
        method: "POST",
        body: "{",
      }),
    );
    const empty = await POST(
      jsonRequest("http://localhost/api/admin/article-categories", "POST", {
        name: "   ",
      }),
    );

    expect(malformed.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(mocks.createArticleCategory).not.toHaveBeenCalled();
  });

  it("creates a category with a 201 response", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/admin/article-categories", "POST", {
        name: "React",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.createArticleCategory).toHaveBeenCalledWith("React");
  });

  it("rejects invalid category ids and ambiguous category patches", async () => {
    const invalidId = await PATCH_CATEGORY(
      jsonRequest("http://localhost/category", "PATCH", { name: "React" }),
      { params: Promise.resolve({ categoryId: "bad" }) },
    );
    const ambiguous = await PATCH_CATEGORY(
      jsonRequest("http://localhost/category", "PATCH", {
        name: "React",
        direction: "up",
      }),
      categoryContext,
    );

    expect(invalidId.status).toBe(400);
    expect(ambiguous.status).toBe(400);
    expect(mocks.renameArticleCategory).not.toHaveBeenCalled();
    expect(mocks.moveArticleCategory).not.toHaveBeenCalled();
  });

  it("renames, moves, and deletes categories", async () => {
    const rename = await PATCH_CATEGORY(
      jsonRequest("http://localhost/category", "PATCH", { name: "React" }),
      categoryContext,
    );
    const move = await PATCH_CATEGORY(
      jsonRequest("http://localhost/category", "PATCH", { direction: "down" }),
      categoryContext,
    );
    const remove = await DELETE(
      new Request("http://localhost/category", { method: "DELETE" }),
      categoryContext,
    );

    expect(rename.status).toBe(200);
    expect(move.status).toBe(200);
    expect(remove.status).toBe(200);
    expect(mocks.renameArticleCategory).toHaveBeenCalledWith(
      CATEGORY_ID,
      "React",
    );
    expect(mocks.moveArticleCategory).toHaveBeenCalledWith(CATEGORY_ID, "down");
    expect(mocks.deleteArticleCategory).toHaveBeenCalledWith(CATEGORY_ID);
  });

  it("maps service errors to their public status and message", async () => {
    mocks.deleteArticleCategory.mockRejectedValue(
      Object.assign(new Error("分类中仍有文章，请先移动文章"), { status: 409 }),
    );

    const response = await DELETE(
      new Request("http://localhost/category", { method: "DELETE" }),
      categoryContext,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "分类中仍有文章，请先移动文章",
    });
  });

  it("rejects invalid assignment slugs and invalid directions", async () => {
    const invalidSlug = await PUT(
      jsonRequest("http://localhost/assignment", "PUT", { categoryId: null }),
      { params: Promise.resolve({ slug: "..%2Fsecret" }) },
    );
    const invalidDirection = await PATCH_ASSIGNMENT(
      jsonRequest("http://localhost/assignment", "PATCH", {
        direction: "sideways",
      }),
      assignmentContext,
    );

    expect(invalidSlug.status).toBe(400);
    expect(invalidDirection.status).toBe(400);
    expect(mocks.assignArticleToCategory).not.toHaveBeenCalled();
    expect(mocks.moveArticleInCategory).not.toHaveBeenCalled();
  });

  it("assigns, unassigns, and moves an encoded article slug", async () => {
    const assign = await PUT(
      jsonRequest("http://localhost/assignment", "PUT", {
        categoryId: CATEGORY_ID,
      }),
      assignmentContext,
    );
    const unassign = await PUT(
      jsonRequest("http://localhost/assignment", "PUT", { categoryId: null }),
      assignmentContext,
    );
    const move = await PATCH_ASSIGNMENT(
      jsonRequest("http://localhost/assignment", "PATCH", { direction: "up" }),
      assignmentContext,
    );

    expect(assign.status).toBe(200);
    expect(unassign.status).toBe(200);
    expect(move.status).toBe(200);
    expect(mocks.assignArticleToCategory).toHaveBeenNthCalledWith(
      1,
      "react-hooks",
      CATEGORY_ID,
    );
    expect(mocks.assignArticleToCategory).toHaveBeenNthCalledWith(
      2,
      "react-hooks",
      null,
    );
    expect(mocks.moveArticleInCategory).toHaveBeenCalledWith(
      "react-hooks",
      "up",
    );
  });
});

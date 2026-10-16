import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticleCategoryAdminState } from "@/lib/articleCategories/types";
import {
  ArticleCategoryApiError,
  requestArticleCategoryState,
  requestAssignArticleCategory,
  requestCreateArticleCategory,
  requestDeleteArticleCategory,
  requestMoveArticleCategory,
  requestMoveArticleInCategory,
  requestRenameArticleCategory,
} from "./articleCategoryApi";

const state: ArticleCategoryAdminState = {
  categories: [],
  unassignedPosts: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("articleCategoryApi", () => {
  it("loads category state without caching and forwards the abort signal", async () => {
    const signal = new AbortController().signal;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(state, { status: 200 })),
    );

    await expect(requestArticleCategoryState(signal)).resolves.toEqual(state);
    expect(fetch).toHaveBeenCalledWith("/api/admin/article-categories", {
      method: "GET",
      cache: "no-store",
      signal,
    });
  });

  it("sends exact category mutation methods and bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => Response.json({ message: "ok" })),
    );

    await requestCreateArticleCategory("React");
    await requestRenameArticleCategory("category/id", "React 19");
    await requestMoveArticleCategory("category/id", "up");
    await requestDeleteArticleCategory("category/id");

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/admin/article-categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "React" }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/article-categories/category%2Fid",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "React 19" }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/api/admin/article-categories/category%2Fid",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ direction: "up" }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      "/api/admin/article-categories/category%2Fid",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("encodes article slugs for assignment and ordering mutations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => Response.json({ message: "ok" })),
    );

    await requestAssignArticleCategory("article/slug", null);
    await requestMoveArticleInCategory("article/slug", "down");

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/admin/article-categories/assignments/article%2Fslug",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ categoryId: null }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/article-categories/assignments/article%2Fslug",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ direction: "down" }),
      }),
    );
  });

  it("preserves HTTP status and server messages on failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { message: "分类中仍有文章，请先移动文章" },
          { status: 409 },
        ),
      ),
    );

    await expect(requestDeleteArticleCategory("category")).rejects.toEqual(
      expect.objectContaining({
        name: "ArticleCategoryApiError",
        status: 409,
        message: "分类中仍有文章，请先移动文章",
      }),
    );
  });

  it("uses meaningful fallbacks for malformed response bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not-json", { status: 500 })),
    );

    await expect(requestCreateArticleCategory("React")).rejects.toEqual(
      expect.objectContaining({
        status: 500,
        message: "创建分类失败",
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
    );
    await expect(requestArticleCategoryState()).rejects.toBeInstanceOf(
      ArticleCategoryApiError,
    );
  });
});

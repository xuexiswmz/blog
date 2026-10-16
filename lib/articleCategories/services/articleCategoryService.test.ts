import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostSummary } from "@/lib/posts";

const repository = vi.hoisted(() => ({
  readArticleCategoryConfiguration: vi.fn(),
  insertArticleCategory: vi.fn(),
  updateArticleCategoryName: vi.fn(),
  removeArticleCategory: vi.fn(),
  putArticleCategoryAssignment: vi.fn(),
  removeArticleCategoryAssignment: vi.fn(),
  shiftArticleCategory: vi.fn(),
  shiftArticleCategoryAssignment: vi.fn(),
}));
const posts = vi.hoisted(() => ({
  getPostSummaries: vi.fn(),
  postExists: vi.fn(),
}));

vi.mock("../repositories/articleCategoryRepository", () => repository);
vi.mock("@/lib/posts", () => posts);

import {
  ArticleCategoryServiceError,
  assignArticleToCategory,
  createArticleCategory,
  deleteArticleCategory,
  getArticleCategoryAdminState,
  getPublicArticleNavigation,
  moveArticleCategory,
  moveArticleInCategory,
  renameArticleCategory,
} from "./articleCategoryService";

const REACT_ID = "11111111-1111-4111-8111-111111111111";
const CSS_ID = "22222222-2222-4222-8222-222222222222";

function summary(slug: string, date = "2026-10-01"): PostSummary {
  return {
    slug,
    title: slug,
    date,
    description: "",
    tags: [],
  };
}

function configuration() {
  return {
    categories: [{ id: REACT_ID, name: "React", position: 8 }],
    assignments: [
      { postSlug: "react-hooks", categoryId: REACT_ID, position: 12 },
    ],
  };
}

describe("articleCategoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    posts.getPostSummaries.mockResolvedValue([
      summary("react-hooks"),
      summary("css-grid", "2026-09-01"),
    ]);
    posts.postExists.mockResolvedValue(true);
    repository.readArticleCategoryConfiguration.mockResolvedValue(
      configuration(),
    );
    repository.shiftArticleCategory.mockResolvedValue(true);
    repository.shiftArticleCategoryAssignment.mockResolvedValue(true);
  });

  it("falls back to an all-articles group when category storage fails", async () => {
    repository.readArticleCategoryConfiguration.mockRejectedValue(
      new Error("database offline"),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getPublicArticleNavigation()).resolves.toEqual([
      {
        id: null,
        name: "全部文章",
        position: 0,
        posts: [
          {
            slug: "react-hooks",
            title: "react-hooks",
            date: "2026-10-01",
            position: 0,
          },
          {
            slug: "css-grid",
            title: "css-grid",
            date: "2026-09-01",
            position: 1,
          },
        ],
      },
    ]);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("omits orphan assignments and normalizes admin display positions", async () => {
    repository.readArticleCategoryConfiguration.mockResolvedValue({
      categories: [{ id: REACT_ID, name: "React", position: 8 }],
      assignments: [
        { postSlug: "deleted", categoryId: REACT_ID, position: 0 },
        { postSlug: "react-hooks", categoryId: REACT_ID, position: 12 },
      ],
    });

    await expect(getArticleCategoryAdminState()).resolves.toEqual({
      categories: [
        {
          id: REACT_ID,
          name: "React",
          position: 0,
          posts: [
            {
              slug: "react-hooks",
              title: "react-hooks",
              date: "2026-10-01",
              position: 0,
            },
          ],
        },
      ],
      unassignedPosts: [
        {
          slug: "css-grid",
          title: "css-grid",
          date: "2026-09-01",
          position: 0,
        },
      ],
    });
  });

  it("trims new category names and rejects case-insensitive duplicates", async () => {
    await expect(createArticleCategory(" react ")).rejects.toMatchObject({
      code: "duplicate_name",
      status: 409,
    });
    expect(repository.insertArticleCategory).not.toHaveBeenCalled();

    repository.readArticleCategoryConfiguration.mockResolvedValue({
      categories: [],
      assignments: [],
    });
    await createArticleCategory("  JavaScript  ");
    expect(repository.insertArticleCategory).toHaveBeenCalledWith("JavaScript");
  });

  it("rejects blank category names", async () => {
    await expect(createArticleCategory("   ")).rejects.toMatchObject({
      code: "invalid_name",
      status: 400,
    });
  });

  it("allows renaming a category to its own normalized name", async () => {
    await renameArticleCategory(REACT_ID, " React ");

    expect(repository.updateArticleCategoryName).toHaveBeenCalledWith(
      REACT_ID,
      "React",
    );
  });

  it("rejects missing categories and non-empty deletion", async () => {
    await expect(renameArticleCategory(CSS_ID, "CSS")).rejects.toMatchObject({
      code: "category_not_found",
      status: 404,
    });
    await expect(deleteArticleCategory(REACT_ID)).rejects.toMatchObject({
      code: "category_not_empty",
      status: 409,
    });
  });

  it("deletes an empty category", async () => {
    repository.readArticleCategoryConfiguration.mockResolvedValue({
      categories: [{ id: REACT_ID, name: "React", position: 0 }],
      assignments: [],
    });

    await deleteArticleCategory(REACT_ID);

    expect(repository.removeArticleCategory).toHaveBeenCalledWith(REACT_ID);
  });

  it("removes an assignment when the target category is null", async () => {
    await assignArticleToCategory("react-hooks", null);

    expect(repository.removeArticleCategoryAssignment).toHaveBeenCalledWith(
      "react-hooks",
    );
    expect(repository.putArticleCategoryAssignment).not.toHaveBeenCalled();
  });

  it("rejects missing posts and missing target categories", async () => {
    posts.postExists.mockResolvedValueOnce(false);
    await expect(
      assignArticleToCategory("deleted-post", REACT_ID),
    ).rejects.toMatchObject({ code: "post_not_found", status: 404 });

    await expect(
      assignArticleToCategory("react-hooks", CSS_ID),
    ).rejects.toMatchObject({ code: "category_not_found", status: 404 });
  });

  it("assigns a real post to an existing category", async () => {
    await assignArticleToCategory("react-hooks", REACT_ID);

    expect(repository.putArticleCategoryAssignment).toHaveBeenCalledWith(
      "react-hooks",
      REACT_ID,
    );
  });

  it("reports category and article boundary moves", async () => {
    repository.shiftArticleCategory.mockResolvedValueOnce(false);
    await expect(moveArticleCategory(REACT_ID, "up")).rejects.toMatchObject({
      code: "cannot_move",
      status: 409,
    });

    repository.shiftArticleCategoryAssignment.mockResolvedValueOnce(false);
    await expect(
      moveArticleInCategory("react-hooks", "down"),
    ).rejects.toMatchObject({ code: "cannot_move", status: 409 });
  });

  it("validates identifiers and move directions before repository access", async () => {
    await expect(renameArticleCategory("not-a-uuid", "CSS")).rejects.toBeInstanceOf(
      ArticleCategoryServiceError,
    );
    await expect(
      moveArticleCategory(REACT_ID, "sideways" as "up"),
    ).rejects.toMatchObject({ code: "invalid_direction", status: 400 });
    await expect(
      assignArticleToCategory("../secret", REACT_ID),
    ).rejects.toMatchObject({ code: "invalid_slug", status: 400 });
  });
});

import { getPostSummaries, postExists } from "@/lib/posts";
import { buildArticleNavigation } from "../navigation";
import type {
  ArticleCategoryAdminState,
  ArticleNavigationGroup,
  ArticleNavigationPost,
} from "../types";
import {
  insertArticleCategory,
  putArticleCategoryAssignment,
  readArticleCategoryConfiguration,
  removeArticleCategory,
  removeArticleCategoryAssignment,
  shiftArticleCategory,
  shiftArticleCategoryAssignment,
  updateArticleCategoryName,
} from "../repositories/articleCategoryRepository";

export type ArticleCategoryServiceErrorCode =
  | "invalid_name"
  | "duplicate_name"
  | "invalid_category_id"
  | "category_not_found"
  | "category_not_empty"
  | "invalid_slug"
  | "post_not_found"
  | "invalid_direction"
  | "cannot_move"
  | "storage";

export class ArticleCategoryServiceError extends Error {
  constructor(
    public readonly code: ArticleCategoryServiceErrorCode,
    public readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArticleCategoryServiceError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw new ArticleCategoryServiceError(
      "invalid_name",
      400,
      "分类名称不能为空",
    );
  }
  return normalized;
}

function validateCategoryId(categoryId: string): void {
  if (!UUID_PATTERN.test(categoryId)) {
    throw new ArticleCategoryServiceError(
      "invalid_category_id",
      400,
      "分类 ID 不合法",
    );
  }
}

function validateSlug(postSlug: string): void {
  if (!POST_SLUG_PATTERN.test(postSlug)) {
    throw new ArticleCategoryServiceError(
      "invalid_slug",
      400,
      "文章 slug 不合法",
    );
  }
}

function validateDirection(direction: string): asserts direction is "up" | "down" {
  if (direction !== "up" && direction !== "down") {
    throw new ArticleCategoryServiceError(
      "invalid_direction",
      400,
      "排序方向不合法",
    );
  }
}

function repositoryCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function rethrowRepositoryError(error: unknown): never {
  const code = repositoryCode(error);
  if (code === "duplicate_name") {
    throw new ArticleCategoryServiceError(
      "duplicate_name",
      409,
      "分类名称已存在",
      { cause: error },
    );
  }
  if (code === "missing_category") {
    throw new ArticleCategoryServiceError(
      "category_not_found",
      404,
      "分类不存在",
      { cause: error },
    );
  }
  if (code === "category_in_use") {
    throw new ArticleCategoryServiceError(
      "category_not_empty",
      409,
      "分类中仍有文章，请先移动文章",
      { cause: error },
    );
  }
  throw new ArticleCategoryServiceError(
    "storage",
    500,
    "文章分类保存失败",
    { cause: error },
  );
}

function fallbackNavigation(posts: Awaited<ReturnType<typeof getPostSummaries>>): ArticleNavigationGroup[] {
  const navigationPosts: ArticleNavigationPost[] = posts.map((post, position) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    position,
  }));
  return navigationPosts.length === 0
    ? []
    : [{ id: null, name: "全部文章", position: 0, posts: navigationPosts }];
}

export async function getPublicArticleNavigation(): Promise<
  ArticleNavigationGroup[]
> {
  const posts = await getPostSummaries();
  try {
    const { categories, assignments } =
      await readArticleCategoryConfiguration();
    return buildArticleNavigation(posts, categories, assignments);
  } catch (error) {
    console.error("读取文章分类失败，使用全部文章导航:", error);
    return fallbackNavigation(posts);
  }
}

export async function getArticleCategoryAdminState(): Promise<ArticleCategoryAdminState> {
  const [posts, configuration] = await Promise.all([
    getPostSummaries(),
    readArticleCategoryConfiguration(),
  ]);
  const groups = buildArticleNavigation(
    posts,
    configuration.categories,
    configuration.assignments,
  );
  const unclassified = groups.find((group) => group.id === null);

  return {
    categories: groups.filter(
      (group): group is ArticleNavigationGroup & { id: string } =>
        group.id !== null,
    ),
    unassignedPosts: unclassified?.posts ?? [],
  };
}

export async function createArticleCategory(name: string): Promise<void> {
  const normalizedName = normalizeName(name);
  const { categories } = await readArticleCategoryConfiguration();
  if (
    categories.some(
      (category) =>
        category.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    )
  ) {
    throw new ArticleCategoryServiceError(
      "duplicate_name",
      409,
      "分类名称已存在",
    );
  }

  try {
    await insertArticleCategory(normalizedName);
  } catch (error) {
    rethrowRepositoryError(error);
  }
}

export async function renameArticleCategory(
  categoryId: string,
  name: string,
): Promise<void> {
  validateCategoryId(categoryId);
  const normalizedName = normalizeName(name);
  const { categories } = await readArticleCategoryConfiguration();
  const category = categories.find((candidate) => candidate.id === categoryId);
  if (!category) {
    throw new ArticleCategoryServiceError(
      "category_not_found",
      404,
      "分类不存在",
    );
  }
  if (
    categories.some(
      (candidate) =>
        candidate.id !== categoryId &&
        candidate.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    )
  ) {
    throw new ArticleCategoryServiceError(
      "duplicate_name",
      409,
      "分类名称已存在",
    );
  }

  try {
    await updateArticleCategoryName(categoryId, normalizedName);
  } catch (error) {
    rethrowRepositoryError(error);
  }
}

export async function deleteArticleCategory(categoryId: string): Promise<void> {
  validateCategoryId(categoryId);
  const { categories, assignments } = await readArticleCategoryConfiguration();
  if (!categories.some((category) => category.id === categoryId)) {
    throw new ArticleCategoryServiceError(
      "category_not_found",
      404,
      "分类不存在",
    );
  }
  if (assignments.some((assignment) => assignment.categoryId === categoryId)) {
    throw new ArticleCategoryServiceError(
      "category_not_empty",
      409,
      "分类中仍有文章，请先移动文章",
    );
  }

  try {
    await removeArticleCategory(categoryId);
  } catch (error) {
    rethrowRepositoryError(error);
  }
}

export async function moveArticleCategory(
  categoryId: string,
  direction: "up" | "down",
): Promise<void> {
  validateCategoryId(categoryId);
  validateDirection(direction);
  const { categories } = await readArticleCategoryConfiguration();
  if (!categories.some((category) => category.id === categoryId)) {
    throw new ArticleCategoryServiceError(
      "category_not_found",
      404,
      "分类不存在",
    );
  }

  try {
    if (!(await shiftArticleCategory(categoryId, direction))) {
      throw new ArticleCategoryServiceError(
        "cannot_move",
        409,
        "分类已经在边界位置",
      );
    }
  } catch (error) {
    if (error instanceof ArticleCategoryServiceError) throw error;
    rethrowRepositoryError(error);
  }
}

export async function assignArticleToCategory(
  postSlug: string,
  categoryId: string | null,
): Promise<void> {
  validateSlug(postSlug);
  if (!(await postExists(postSlug))) {
    throw new ArticleCategoryServiceError(
      "post_not_found",
      404,
      "文章不存在",
    );
  }

  try {
    if (categoryId === null) {
      await removeArticleCategoryAssignment(postSlug);
      return;
    }

    validateCategoryId(categoryId);
    const { categories } = await readArticleCategoryConfiguration();
    if (!categories.some((category) => category.id === categoryId)) {
      throw new ArticleCategoryServiceError(
        "category_not_found",
        404,
        "分类不存在",
      );
    }
    await putArticleCategoryAssignment(postSlug, categoryId);
  } catch (error) {
    if (error instanceof ArticleCategoryServiceError) throw error;
    rethrowRepositoryError(error);
  }
}

export async function moveArticleInCategory(
  postSlug: string,
  direction: "up" | "down",
): Promise<void> {
  validateSlug(postSlug);
  validateDirection(direction);
  if (!(await postExists(postSlug))) {
    throw new ArticleCategoryServiceError(
      "post_not_found",
      404,
      "文章不存在",
    );
  }

  try {
    if (!(await shiftArticleCategoryAssignment(postSlug, direction))) {
      throw new ArticleCategoryServiceError(
        "cannot_move",
        409,
        "文章已经在边界位置或尚未分类",
      );
    }
  } catch (error) {
    if (error instanceof ArticleCategoryServiceError) throw error;
    rethrowRepositoryError(error);
  }
}

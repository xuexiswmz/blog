import {
  assignArticleToCategory,
  moveArticleInCategory,
} from "@/lib/articleCategories/services/articleCategoryService";
import {
  decodeSlug,
  hasExactKeys,
  jsonResponse,
  readObjectBody,
  requireAdmin,
  serviceErrorResponse,
  UUID_PATTERN,
} from "../../http";

type AssignmentContext = {
  params: Promise<{ slug: string }>;
};

export async function PUT(request: Request, context: AssignmentContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { slug: rawSlug } = await context.params;
  const slug = decodeSlug(rawSlug);
  if (!slug) return jsonResponse({ message: "文章 slug 不合法" }, 400);

  const body = await readObjectBody(request);
  if (!body || !hasExactKeys(body, ["categoryId"])) {
    return jsonResponse({ message: "文章分类内容不合法" }, 400);
  }
  if (
    body.categoryId !== null &&
    (typeof body.categoryId !== "string" || !UUID_PATTERN.test(body.categoryId))
  ) {
    return jsonResponse({ message: "分类 ID 不合法" }, 400);
  }

  try {
    await assignArticleToCategory(slug, body.categoryId as string | null);
    return jsonResponse({ message: "文章分类已更新" });
  } catch (error) {
    return serviceErrorResponse(error, "更新文章分类失败");
  }
}

export async function PATCH(request: Request, context: AssignmentContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { slug: rawSlug } = await context.params;
  const slug = decodeSlug(rawSlug);
  if (!slug) return jsonResponse({ message: "文章 slug 不合法" }, 400);

  const body = await readObjectBody(request);
  if (
    !body ||
    !hasExactKeys(body, ["direction"]) ||
    (body.direction !== "up" && body.direction !== "down")
  ) {
    return jsonResponse({ message: "排序方向不合法" }, 400);
  }

  try {
    await moveArticleInCategory(slug, body.direction);
    return jsonResponse({ message: "文章顺序已更新" });
  } catch (error) {
    return serviceErrorResponse(error, "更新文章顺序失败");
  }
}

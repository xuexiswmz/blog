import {
  deleteArticleCategory,
  moveArticleCategory,
  renameArticleCategory,
} from "@/lib/articleCategories/services/articleCategoryService";
import {
  hasExactKeys,
  jsonResponse,
  readObjectBody,
  requireAdmin,
  serviceErrorResponse,
  UUID_PATTERN,
} from "../http";

type CategoryContext = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(request: Request, context: CategoryContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { categoryId } = await context.params;
  if (!UUID_PATTERN.test(categoryId)) {
    return jsonResponse({ message: "分类 ID 不合法" }, 400);
  }

  const body = await readObjectBody(request);
  if (!body) return jsonResponse({ message: "请求内容不合法" }, 400);

  try {
    if (
      hasExactKeys(body, ["name"]) &&
      typeof body.name === "string" &&
      body.name.trim()
    ) {
      await renameArticleCategory(categoryId, body.name.trim());
      return jsonResponse({ message: "分类名称已更新" });
    }

    if (
      hasExactKeys(body, ["direction"]) &&
      (body.direction === "up" || body.direction === "down")
    ) {
      await moveArticleCategory(categoryId, body.direction);
      return jsonResponse({ message: "分类顺序已更新" });
    }

    return jsonResponse({ message: "分类更新内容不合法" }, 400);
  } catch (error) {
    return serviceErrorResponse(error, "更新分类失败");
  }
}

export async function DELETE(request: Request, context: CategoryContext) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { categoryId } = await context.params;
  if (!UUID_PATTERN.test(categoryId)) {
    return jsonResponse({ message: "分类 ID 不合法" }, 400);
  }

  try {
    await deleteArticleCategory(categoryId);
    return jsonResponse({ message: "分类已删除" });
  } catch (error) {
    return serviceErrorResponse(error, "删除分类失败");
  }
}

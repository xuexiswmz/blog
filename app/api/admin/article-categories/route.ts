import {
  createArticleCategory,
  getArticleCategoryAdminState,
} from "@/lib/articleCategories/services/articleCategoryService";
import {
  hasExactKeys,
  jsonResponse,
  readObjectBody,
  requireAdmin,
  serviceErrorResponse,
} from "./http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    return jsonResponse(await getArticleCategoryAdminState());
  } catch (error) {
    return serviceErrorResponse(error, "读取文章分类失败");
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await readObjectBody(request);
  if (
    !body ||
    !hasExactKeys(body, ["name"]) ||
    typeof body.name !== "string" ||
    !body.name.trim()
  ) {
    return jsonResponse({ message: "分类名称不能为空" }, 400);
  }

  try {
    await createArticleCategory(body.name.trim());
    return jsonResponse({ message: "分类已创建" }, 201);
  } catch (error) {
    return serviceErrorResponse(error, "创建分类失败");
  }
}

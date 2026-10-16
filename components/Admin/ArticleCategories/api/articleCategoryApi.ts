import type { ArticleCategoryAdminState } from "@/lib/articleCategories/types";

type ApiMessage = { message?: string };

export class ArticleCategoryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ArticleCategoryApiError";
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(url, init);
  const data = await readJson<T & ApiMessage>(response);

  if (!response.ok) {
    throw new ArticleCategoryApiError(
      data?.message ?? fallbackMessage,
      response.status,
    );
  }
  if (!data) {
    throw new ArticleCategoryApiError(
      "文章分类接口没有返回有效数据",
      response.status,
    );
  }
  return data;
}

function mutationRequest(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  fallbackMessage: string,
  body?: unknown,
): Promise<ApiMessage> {
  return requestJson<ApiMessage>(
    url,
    {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    fallbackMessage,
  );
}

export function requestArticleCategoryState(
  signal?: AbortSignal,
): Promise<ArticleCategoryAdminState> {
  return requestJson<ArticleCategoryAdminState>(
    "/api/admin/article-categories",
    { method: "GET", cache: "no-store", signal },
    "读取文章分类失败",
  );
}

export async function requestCreateArticleCategory(name: string): Promise<void> {
  await mutationRequest(
    "/api/admin/article-categories",
    "POST",
    "创建分类失败",
    { name },
  );
}

export async function requestRenameArticleCategory(
  categoryId: string,
  name: string,
): Promise<void> {
  await mutationRequest(
    `/api/admin/article-categories/${encodeURIComponent(categoryId)}`,
    "PATCH",
    "修改分类名称失败",
    { name },
  );
}

export async function requestMoveArticleCategory(
  categoryId: string,
  direction: "up" | "down",
): Promise<void> {
  await mutationRequest(
    `/api/admin/article-categories/${encodeURIComponent(categoryId)}`,
    "PATCH",
    "调整分类顺序失败",
    { direction },
  );
}

export async function requestDeleteArticleCategory(
  categoryId: string,
): Promise<void> {
  await mutationRequest(
    `/api/admin/article-categories/${encodeURIComponent(categoryId)}`,
    "DELETE",
    "删除分类失败",
  );
}

export async function requestAssignArticleCategory(
  postSlug: string,
  categoryId: string | null,
): Promise<void> {
  await mutationRequest(
    `/api/admin/article-categories/assignments/${encodeURIComponent(postSlug)}`,
    "PUT",
    "更新文章分类失败",
    { categoryId },
  );
}

export async function requestMoveArticleInCategory(
  postSlug: string,
  direction: "up" | "down",
): Promise<void> {
  await mutationRequest(
    `/api/admin/article-categories/assignments/${encodeURIComponent(postSlug)}`,
    "PATCH",
    "调整文章顺序失败",
    { direction },
  );
}

import { CommentCountsResponse } from "../Comment/types";

/**
 * 获取一篇文章中各个段落的评论数量。
 *
 * 返回格式：
 * {
 *   "p-段落1": 3,
 *   "p-段落2": 1
 * }
 */
export async function requestCommentCounts(
  postSlug: string,
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  const response = await fetch(
    `/api/posts/${encodeURIComponent(postSlug)}/comments/counts`,
    {
      method: "GET",
      cache: "no-cache",
      signal,
    },
  );

  const result = (await response.json()) as CommentCountsResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(result.message ?? "获取段评数量失败");
  }

  return result.counts;
}

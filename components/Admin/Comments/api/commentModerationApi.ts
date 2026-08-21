import type {
  CommentsResponse,
  ReviewAction,
} from "../types/commentModeration";

type ApiMessageResponse = {
  message?: string;
};

/**
 * 后台评论接口错误。
 *
 * 除了错误信息，还保留 HTTP 状态码，
 * 让调用方可以区分未登录、服务器错误等情况。
 */
export class CommentModerationApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CommentModerationApiError";
  }
}

/**
 * 安全读取 JSON。
 *
 * 某些错误响应可能没有 JSON body，
 * 这时返回 null，而不是再次抛出 JSON 解析错误。
 */
async function readJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

/**
 * 获取所有待审核评论。
 *
 * signal 允许调用方在组件卸载时取消请求。
 */
export async function requestPendingComments(
  signal?: AbortSignal,
): Promise<CommentsResponse> {
  const response = await fetch("/api/admin/comments", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const data = await readJson<CommentsResponse>(response);

  if (!response.ok) {
    throw new CommentModerationApiError(
      data?.message ?? "读取待审核评论失败",
      response.status,
    );
  }

  if (!data) {
    throw new CommentModerationApiError(
      "待审核评论接口没有返回有效数据",
      response.status,
    );
  }

  return data;
}

/**
 * 审核一条评论。
 *
 * action：
 * - approve：通过
 * - reject：拒绝
 */
export async function requestCommentReview(
  commentId: string,
  action: ReviewAction,
): Promise<void> {
  const response = await fetch("/api/admin/comments", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      commentId,
      action,
    }),
  });

  const data = await readJson<ApiMessageResponse>(response);

  if (!response.ok) {
    throw new CommentModerationApiError(
      data?.message ?? "审核评论失败",
      response.status,
    );
  }
}

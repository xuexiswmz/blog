import Link from "next/link";
import type { PendingComment } from "../types/commentModeration";
import {
  formatCommentDate,
  getCommentType,
  getModerationStatus,
} from "../utils/commentModeration";

type CommentDetailContentProps = {
  comment: PendingComment;
};

/**
 * 展示一条待审核评论的完整信息。
 *
 * 这是纯展示组件：
 * - 不管理弹窗状态
 * - 不处理审核请求
 * - 不操作页面滚动
 */
export default function CommentDetailContent({
  comment,
}: CommentDetailContentProps) {
  const moderationStatusClass =
    comment.moderationSource === "ai"
      ? "inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
      : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300";

  return (
    <>
      <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            用户名
          </dt>
          <dd className="mt-1 wrap-break-words font-medium">
            {comment.username}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            时间
          </dt>
          <dd className="mt-1 text-gray-700 dark:text-gray-200">
            <time dateTime={comment.createdAt}>
              {formatCommentDate(comment.createdAt)}
            </time>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            类型
          </dt>
          <dd className="mt-2">
            <span className="inline-flex min-w-20 justify-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {getCommentType(comment.rootId)}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            AI 状态
          </dt>
          <dd className="mt-2">
            <span className={moderationStatusClass}>
              {getModerationStatus(comment.moderationSource)}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            文章
          </dt>
          <dd className="mt-1">
            <Link
              href={`/posts/${comment.postSlug}`}
              target="_blank"
              rel="noreferrer"
              className="break-all text-blue-600 hover:underline dark:text-blue-400"
            >
              {comment.postSlug}
            </Link>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            段落
          </dt>
          <dd className="mt-1">
            <Link
              href={`/posts/${comment.postSlug}#${comment.blockId}`}
              target="_blank"
              rel="noreferrer"
              className="break-all text-blue-600 hover:underline dark:text-blue-400"
            >
              {comment.blockId}
            </Link>
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
            模型
          </dt>
          <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">
            {comment.moderationModel ?? "未记录"}
          </dd>
        </div>
      </dl>

      <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
        <h3 className="text-sm font-semibold">评论内容</h3>

        <p className="mt-3 whitespace-pre-wrap wrap-break-words border-l-2 border-gray-300 pl-4 text-base leading-7 text-gray-800 dark:border-gray-700 dark:text-gray-100">
          {comment.content}
        </p>
      </section>

      <section className="mt-8 rounded-2xl bg-gray-50 p-5 dark:bg-gray-900/70">
        <h3 className="text-sm font-semibold">AI 审核说明</h3>

        <p className="mt-2 whitespace-pre-wrap wrap-break-words text-sm leading-6 text-gray-600 dark:text-gray-300">
          {comment.moderationReason ?? "没有提供审核原因"}
        </p>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import CommentActions from "./Actions";
import { PendingComment, ReviewCommentHandler } from "./types";
import Content from "./Content";
import { formatCommentDate, getModerationStatus } from "./utils";

type CommentDesktopTableProps = {
  comments: PendingComment[];
  reviewingId: string | null;
  onReview: ReviewCommentHandler;
  onViewDetails: (commentId: string) => void;
};

export default function CommentDesktopTable({
  comments,
  reviewingId,
  onReview,
  onViewDetails,
}: CommentDesktopTableProps) {
  return (
    <div className="hidden overflow-x-auto border-y border-gray-200 dark:border-gray-800 md:block">
      <table className="w-full min-w-270 border-collapse text-left text-sm">
        <caption className="sr-only">待审核评论列表</caption>

        <thead className="bg-gray-50 text-xs font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            <th scope="col" className="w-32 px-4 py-3">
              用户名
            </th>
            <th scope="col" className="w-44 px-4 py-3">
              时间
            </th>
            <th scope="col" className="min-w-96 px-4 py-3">
              评论
            </th>
            <th scope="col" className="w-36 px-4 py-3">
              AI 状态
            </th>
            <th scope="col" className="w-44 px-4 py-3">
              模型
            </th>
            <th scope="col" className="w-52 px-4 py-3">
              段落
            </th>
            <th
              scope="col"
              className="sticky right-0 w-56 bg-gray-50 px-4 py-3 text-right dark:bg-gray-900"
            >
              操作
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {comments.map((comment) => {
            const reviewing = reviewingId === comment.id;

            return (
              <tr
                key={comment.id}
                className="group align-top transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
              >
                <td className="px-4 py-4 font-medium">
                  <span className="block max-w-28 wrap-break-words">
                    {comment.username}
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                  <time dateTime={comment.createdAt}>
                    {formatCommentDate(comment.createdAt)}
                  </time>
                </td>

                <td className="px-4 py-4">
                  <Content content={comment.content} />
                </td>

                <td className="px-4 py-4">
                  <span
                    className={
                      comment.moderationSource === "ai"
                        ? "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                        : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }
                  >
                    {getModerationStatus(comment.moderationSource)}
                  </span>
                </td>

                <td className="px-4 py-4 text-gray-500">
                  <span className="block break-all">
                    {comment.moderationModel ?? "—"}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <Link
                    href={`/posts/${comment.postSlug}#${comment.blockId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {comment.blockId}
                  </Link>
                </td>

                <td className="sticky right-0 bg-white px-4 py-4 transition-colors group-hover:bg-gray-50 dark:bg-black dark:group-hover:bg-gray-900">
                  <CommentActions
                    commentId={comment.id}
                    disabled={reviewingId !== null}
                    reviewing={reviewing}
                    onReview={onReview}
                    onViewDetails={() => onViewDetails(comment.id)}
                    align="end"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

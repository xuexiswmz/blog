"use client";

import CommentActions from "./CommentActions";
import Content from "./CommentContent";
import {
  type PendingComment,
  type ReviewCommentHandler,
} from "../types/commentModeration";

type CommentMobileListProps = {
  comments: PendingComment[];
  reviewingId: string | null;
  onReview: ReviewCommentHandler;
  onViewDetails: (commentId: string) => void;
};

export default function CommentMobileList({
  comments,
  reviewingId,
  onReview,
  onViewDetails,
}: CommentMobileListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {comments.map((comment) => {
        const reviewing = reviewingId === comment.id;

        return (
          <li
            key={comment.id}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <strong className="block wrap-break-words text-sm">
              {comment.username}
            </strong>

            <div className="mt-3 text-sm">
              <Content content={comment.content} />
            </div>

            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <CommentActions
                commentId={comment.id}
                disabled={reviewingId !== null}
                reviewing={reviewing}
                onReview={onReview}
                onViewDetails={() => onViewDetails(comment.id)}
                align="start"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

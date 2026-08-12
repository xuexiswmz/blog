export type PendingComment = {
  id: string;
  postSlug: string;
  blockId: string;
  rootId: string | null;
  replyToId: string | null;
  username: string;
  content: string;
  status: string;
  createdAt: string;
  authorType: "guest" | "admin" | "ai";
  moderationSource: "ai" | "human" | null;
  moderationReason: string | null;
  moderationModel: string | null;
  moderatedAt: string | null;
};

export type CommentsResponse = {
  comments: PendingComment[];
  count: number;
  message?: string;
};

export type ReviewAction = "approve" | "reject";

export type ReviewCommentHandler = (
  commentId: string,
  action: ReviewAction,
) => Promise<void>;

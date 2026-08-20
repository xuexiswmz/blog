export type ParagraphComment = {
  id: string;
  username: string;
  content: string;
  createdAt: string;

  rootId: string | null;
  replyToId: string | null;

  replyToUsername: string | null;
  replyToContent: string | null;

  deleted: boolean;
  replies: ParagraphComment[];
};

export type CommentListResponse = {
  comments: ParagraphComment[];
  count: number;
};

export type CommentSubmitResponse = {
  message?: string;
  comment?: {
    id: string;
    username: string;
    content: string;
    rootId: string | null;
    replyToId: string | null;
    createdAt: string;
    status: "published" | "pending" | "rejected";
  };
};

export type CommentCountsResponse = {
  counts: Record<string, number>;
};

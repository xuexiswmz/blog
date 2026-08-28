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
  canDelete: boolean;
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

export type ParagraphTextSelection = {
  paragraphId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  position: {
    x: number;
    y: number;
    placement: "top" | "bottom";
  };
};

export type TextAnnotationLineStyle = "solid" | "double" | "wavy";

export type TextAnnotationColor =
  | "amber"
  | "rose"
  | "sky"
  | "emerald"
  | "violet";

export type TextAnnotation = {
  id: string;
  postSlug: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  lineStyle: TextAnnotationLineStyle;
  color: TextAnnotationColor;
  createdAt: string;
};

export type NewTextAnnotation = Omit<
  TextAnnotation,
  "id" | "postSlug" | "createdAt"
>;

export type TextAnnotationsResponse = {
  annotations: TextAnnotation[];
  message?: string;
};

export type CreateTextAnnotationResponse = {
  annotation: TextAnnotation;
  replacedIds: string[];
  message?: string;
};

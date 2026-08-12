import { PendingComment } from "./types";

const commentDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatCommentDate(createdAt: string) {
  return commentDateFormatter.format(new Date(createdAt));
}

export function getCommentType(rootId: string | null) {
  return rootId ? "回复" : "根评论";
}

export function getModerationStatus(
  source: PendingComment["moderationSource"],
) {
  return source === "ai" ? "人工复核" : "未经过AI";
}

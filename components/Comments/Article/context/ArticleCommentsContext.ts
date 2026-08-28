"use client";

import { createContext, useContext } from "react";
import type {
  NewTextAnnotation,
  ParagraphTextSelection,
} from "../../Comment/types";

/**
 * 一篇文章内所有可评论段落共享的数据。
 *
 * Provider 负责提供数据，
 * CommentableParagraph 等消费组件通过 useArticleComments() 读取。
 */
export type ArticleCommentsContextValue = {
  postSlug: string;
  commentCounts: Record<string, number>;
  refreshCommentCounts: () => Promise<void>;
  paragraphSelection: ParagraphTextSelection | null;
  canManageTextAnnotations: boolean;
  addTextAnnotation: (annotation: NewTextAnnotation) => Promise<void>;
};

/**
 * 默认值使用 null，可以区分：
 *
 * 1. Context 中暂时没有数据
 * 2. 消费组件根本没有被 Provider 包裹
 */
export const ArticleCommentsContext =
  createContext<ArticleCommentsContextValue | null>(null);

/**
 * 统一读取文章评论 Context。
 *
 * 如果组件没有放在 ArticleCommentsProvider 内，
 * 直接抛出明确错误，消费组件不需要重复处理 null。
 */
export function useArticleComments() {
  const context = useContext(ArticleCommentsContext);

  if (!context) {
    throw new Error("useArticleComments 必须在 ArticleCommentsProvider 内使用");
  }

  return context;
}

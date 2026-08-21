"use client";

import { type ReactNode, useMemo } from "react";
import { ArticleCommentsContext } from "../context/ArticleCommentsContext";
import { useParagraphTextSelection } from "../hooks/useParagraphTextSelection";
import { useArticleCommentCounts } from "../hooks/useArticleCommentCounts";

type ArticleCommentsProviderProps = {
  postSlug: string;
  children: ReactNode;
};

/**
 * 组合一篇文章需要共享的段评状态。
 *
 * 具体业务分别交给：
 * - useArticleCommentCounts：管理段评数量
 * - useParagraphTextSelection：管理文章文字选区
 *
 * Provider 只负责把这些数据通过 Context 提供给下层组件。
 */
function ArticleCommentsProvider({
  postSlug,
  children,
}: ArticleCommentsProviderProps) {
  // 管理用户当前选择的段落文字。
  const paragraphSelection = useParagraphTextSelection();
  // 管理整篇文章各个段落的评论数量。
  const { commentCounts, refreshCommentCounts } =
    useArticleCommentCounts(postSlug);

  // 保持 Context value 的对象引用稳定。
  // 只有依赖数据真正发生变化时才创建新对象，避免 Provider 因其他原因渲染时通知所有段落组件更新。
  const contextValue = useMemo(
    () => ({
      postSlug,
      commentCounts,
      refreshCommentCounts,
      paragraphSelection,
    }),
    [postSlug, commentCounts, refreshCommentCounts, paragraphSelection],
  );

  return (
    <ArticleCommentsContext.Provider value={contextValue}>
      {children}
    </ArticleCommentsContext.Provider>
  );
}

export default ArticleCommentsProvider;

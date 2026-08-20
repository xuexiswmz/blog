"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type CommentCountsResponse,
  type ParagraphTextSelection,
} from "../Comment/types";

// 所有段评组件共享的数据与操作。
// 段落组件通过 useArticleComments() 使用这些值，不需要逐层传递 props。
type ArticleCommentsContextValue = {
  postSlug: string;
  commentCounts: Record<string, number>;
  refreshCommentCounts: () => Promise<void>;
  paragraphSelection: ParagraphTextSelection | null;
};

const ArticleCommentsContext =
  createContext<ArticleCommentsContextValue | null>(null);

type ArticleCommentsProviderProps = {
  postSlug: string;
  children: ReactNode;
};

// 纯数据请求函数：只负责获取数量，不直接修改 React state。
// 首次加载和评论发布后的手动刷新都可以复用它。
async function requestCommentCounts(postSlug: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/posts/${encodeURIComponent(postSlug)}/comments/counts`,
    {
      method: "GET",
      cache: "no-cache",
      signal,
    },
  );

  const result = (await response.json()) as CommentCountsResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(result.message ?? "获取段评数量失败");
  }

  return result.counts;
}

// 统一管理一篇文章内的评论数量与当前文字选区。
function ArticleCommentsProvider({
  postSlug,
  children,
}: ArticleCommentsProviderProps) {
  // key 是稳定段落 ID，value 是该段落已发布且未删除的评论数量。
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );

  // 整篇文章同一时间只保留一个有效文字选区。
  const [paragraphSelection, setParagraphSelection] =
    useState<ParagraphTextSelection | null>(null);

  // 文章首次加载或 slug 改变时，同步该文章所有段落的评论数量。
  // AbortController 防止组件卸载或文章切换后继续处理旧请求。
  useEffect(() => {
    const controller = new AbortController();

    async function syncCommentCounts() {
      try {
        const counts = await requestCommentCounts(postSlug, controller.signal);

        setCommentCounts(counts);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("获取段评数量失败", error);
      }
    }

    void syncCommentCounts();

    return () => {
      controller.abort();
    };
  }, [postSlug]);

  // selectionchange 是文档级事件，因此整篇文章只注册一个监听器。
  // 监听器会判断选区是否位于带 data-paragraph-id 的可评论段落中。
  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();

      // 光标状态或空选区不属于有效的段落文字选择。
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setParagraphSelection(null);
        return;
      }

      const selectText = selection.toString().trim();
      if (!selectText) {
        setParagraphSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const commonNode = range.commonAncestorContainer;

      // commonAncestorContainer 可能是文本节点，文本节点没有 closest()，
      // 因此需要先转换成对应的 Element。
      const commonElement =
        commonNode instanceof Element ? commonNode : commonNode.parentElement;

      const paragraph = commonElement?.closest<HTMLElement>(
        "[data-paragraph-id]",
      );

      const paragraphId = paragraph?.dataset.paragraphId;

      if (!paragraphId) {
        setParagraphSelection(null);
        return;
      }

      // 选区没有变化时返回旧对象，避免产生没有必要的 Context 更新。
      setParagraphSelection((current) => {
        if (
          current?.paragraphId === paragraphId &&
          current.text === selectText
        ) {
          return current;
        }
        return {
          paragraphId,
          text: selectText,
        };
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // 评论通过审核并发布后调用，重新获取各段落的最新数量。
  const refreshCommentCounts = useCallback(async () => {
    try {
      const counts = await requestCommentCounts(postSlug);
      setCommentCounts(counts);
    } catch (error) {
      console.error("刷新段评数量失败", error);
    }
  }, [postSlug]);

  // Context 根据 value 的对象引用判断是否变化。
  // useMemo 避免 Provider 因无关原因渲染时让所有段落一起重新渲染。
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

// 集中处理 Context 缺失的错误，消费组件不需要重复判空。
export function useArticleComments() {
  const context = useContext(ArticleCommentsContext);
  if (!context) {
    throw new Error("useArticleComments 必须在 ArticleCommentsProvider 内使用");
  }
  return context;
}

export default ArticleCommentsProvider;

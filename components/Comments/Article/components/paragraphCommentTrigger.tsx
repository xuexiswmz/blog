import { MessageCircle } from "lucide-react";
import type {
  ParagraphTextSelection,
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";
import SelectionCommentTooltip from "./SelectionCommentTooltip";

type ParagraphCommentTriggerProps = {
  commentCount: number;
  selection: ParagraphTextSelection | null;
  expanded: boolean;
  controls: string;
  onAddComment: () => void;
  onOpenComments: () => void;
  onAddAnnotation: (
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) => void;
};

/**
 * 根据评论数量显示不同入口：
 *
 * - 有评论：始终只显示评论数量
 * - 无评论且选中文字：显示浮动 Tooltip
 * - 无评论且没有选中文字：不显示
 */
export default function ParagraphCommentTrigger({
  commentCount,
  selection,
  expanded,
  controls,
  onAddComment,
  onOpenComments,
  onAddAnnotation,
}: ParagraphCommentTriggerProps) {
  if (commentCount === 0 && !selection) {
    return null;
  }
  const displayedCount = commentCount > 99 ? "99+" : commentCount;

  return (
    <>
      {commentCount > 0 && (
        <button
          type="button"
          aria-label={`查看段评，共 ${commentCount} 条评论`}
          aria-expanded={expanded}
          aria-controls={controls}
          onClick={onOpenComments}
          className="
              not-prose
              relative mt-1
              inline-flex size-9
              items-center justify-center
              rounded-full
              text-slate-400
              transition-colors
              hover:bg-slate-100
              hover:text-sky-500
              dark:text-slate-500
              dark:hover:bg-[#242424]
              dark:hover:text-sky-400
            "
        >
          <MessageCircle
            aria-hidden="true"
            className="size-5"
            strokeWidth={1.5}
          />

          <span
            aria-hidden="true"
            className="
            pointer-events-none
            absolute inset-0
            flex items-center justify-center
            text-[8px] font-semibold leading-none
            tabular-nums
          "
          >
            {displayedCount}
          </span>
        </button>
      )}

      {selection && (
        <SelectionCommentTooltip
          position={selection.position}
          onAddComment={onAddComment}
          onAddAnnotation={onAddAnnotation}
        />
      )}
    </>
  );
}

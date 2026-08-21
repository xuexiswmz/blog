import { MessageCircle } from "lucide-react";

type ParagraphCommentTriggerProps = {
  commentCount: number;
  expanded: boolean;
  controls: string;
  onOpen: () => void;
};

export default function ParagraphCommentTrigger({
  commentCount,
  expanded,
  controls,
  onOpen,
}: ParagraphCommentTriggerProps) {
  if (commentCount <= 0) {
    return null;
  }

  const disaplyedCount = commentCount > 99 ? "99+" : commentCount;

  return (
    <button
      type="button"
      aria-label="查看段评"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onOpen}
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
      <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.5} />
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold pointer-events-none"
      >
        {disaplyedCount}
      </span>
    </button>
  );
}

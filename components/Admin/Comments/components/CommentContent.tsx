"use client";

import { useState } from "react";

type CommentContentProps = {
  content: string;
};

const COMMENT_PREVIEW_LENGTH = 24;

export default function CommentContent({ content }: CommentContentProps) {
  const characters = Array.from(content);
  const [expanded, setExpanded] = useState(false);
  const collapsible = characters.length > COMMENT_PREVIEW_LENGTH;

  const visibleContent =
    collapsible && !expanded
      ? `${characters.slice(0, COMMENT_PREVIEW_LENGTH).join("")}…`
      : content;

  return (
    <div>
      <p className="whitespace-pre-wrap wrap-break-words leading-6">
        {visibleContent}
      </p>

      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");

  return {
    ...actual,
    createPortal: (children: ReactNode) => children,
  };
});

import ParagraphCommentTrigger from "./paragraphCommentTrigger";

const selection = {
  paragraphId: "paragraph-1",
  text: "选中的文字",
  startOffset: 0,
  endOffset: 5,
  position: {
    x: 120,
    y: 80,
    placement: "top" as const,
  },
};

function renderTrigger(commentCount: number) {
  vi.stubGlobal("document", { body: {} });

  return renderToStaticMarkup(
    <ParagraphCommentTrigger
      commentCount={commentCount}
      selection={selection}
      expanded={false}
      controls="comments-paragraph-1"
      onAddComment={() => undefined}
      onOpenComments={() => undefined}
      canManageTextAnnotations={false}
      onAddAnnotation={() => undefined}
    />,
  );
}

describe("ParagraphCommentTrigger", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not show the selection tooltip when the paragraph already has comments", () => {
    const markup = renderTrigger(2);

    expect(markup).toContain("查看段评，共 2 条评论");
    expect(markup).not.toContain("选中文字操作");
    expect(markup).not.toContain("添加段评");
  });

  it("shows the selection tooltip when the paragraph has no comments", () => {
    const markup = renderTrigger(0);

    expect(markup).toContain("选中文字操作");
    expect(markup).toContain("添加段评");
  });
});

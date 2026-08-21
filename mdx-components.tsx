import type { MDXComponents } from "mdx/types";
import { ComponentPropsWithoutRef } from "react";
import CommentableParagraph from "./components/Comments/Article/components/CommentableParagraph";

type ParagraphProps = ComponentPropsWithoutRef<"p"> & {
  "data-paragraph-id"?: string;
};

function Paragraph(props: ParagraphProps) {
  const paragraphId = props["data-paragraph-id"];

  if (!paragraphId) {
    return <p {...props} />;
  }

  return <CommentableParagraph {...props} paragraphId={paragraphId} />;
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    p: Paragraph,
    ...components,
  };
}

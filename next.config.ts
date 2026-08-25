import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import path from "node:path";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const remarkParagraphIdPath = path.resolve(
  process.cwd(),
  "plugins",
  "remark-paragraph-id.mjs",
);

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-gfm", remarkParagraphIdPath],
    rehypePlugins: [
      [
        "@shikijs/rehype",
        {
          themes: {
            light: "vitesse-light",
            dark: "vitesse-dark",
          },
          defaultColor: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);

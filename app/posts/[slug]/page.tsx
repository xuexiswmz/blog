import { readdir } from "node:fs/promises";
import path from "node:path";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PostPage({
  params,
}: PostPageProps) {
  const { slug } = await params;

  const { default: Post } = await import(
    `@/content/posts/${slug}.mdx`
  );

  return (
    <article className="
      prose prose-sm prose-slate
      mx-auto w-full min-w-0 max-w-3xl
      px-4 py-8
      sm:prose-base sm:px-6 sm:py-12
      dark:prose-invert

      prose-h1:text-3xl
      sm:prose-h1:text-4xl

      prose-h2:text-2xl
      sm:prose-h2:text-3xl

      [overflow-wrap:anywhere]

      [&_pre]:max-w-full
      [&_pre]:overflow-x-auto

      [&_table]:block
      [&_table]:max-w-full
      [&_table]:overflow-x-auto

      [&_img]:h-auto
      [&_img]:max-w-full
    ">
      <Post />
    </article>
  );
}

export async function generateStaticParams() {
  const postsDirectory = path.join(
    process.cwd(),
    "content",
    "posts",
  );

  const filenames =
    await readdir(postsDirectory);

  return filenames
    .filter((filename) =>
      filename.endsWith(".mdx"),
    )
    .map((filename) => ({
      slug: filename.replace(/\.mdx$/, ""),
    }));
}

export const dynamicParams = false;
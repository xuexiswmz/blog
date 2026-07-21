import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type PostSummary = {
    slug: string;
    title: string;
    date: string;
    description: string;
    image?: string;
    imageAlt?: string;
    tags: string[];
}

export type PostArchive = {
  year: string;
  posts: PostSummary[];
};

const postsDirectory = path.join(
  process.cwd(),
  "content",
  "posts",
);

export async function getPostArchives():Promise<PostArchive[]> {
    const filenames = await readdir(postsDirectory)

    const posts = await Promise.all(
        filenames
            .filter((filename)=>filename.endsWith(".mdx"))
            .map(async (filename): Promise<PostSummary> => {
                const filePath = path.join(postsDirectory, filename)
                const source = await readFile(filePath, "utf8")

                const {data} = matter(source)

                const slug = filename.replace(/\.mdx$/, "")
                const title = typeof data.title === "string" ? data.title : slug

                return {
                    slug,
                    title,
                    date: typeof data.date === "string" ? data.date : "",
                    description:
                        typeof data.description === "string"
                        ? data.description
                        : "",
                    image:
                        typeof data.image === "string"
                        ? data.image
                        : undefined,
                    imageAlt:
                        typeof data.imageAlt === "string"
                        ? data.imageAlt
                        : undefined,
                    tags: Array.isArray(data.tags)
                        ? data.tags.map(String)
                        : [],
                }
            })
    )
    posts.sort((a,b) => b.date.localeCompare(a.date))

    const groups = new Map<string, PostSummary[]>()

    for (const post of posts) {
        if (!post.date) {
            continue
        }
        const year = post.date.slice(0, 4)
        const yearPosts = groups.get(year)??[]

        yearPosts.push(post)
        groups.set(year, yearPosts)
    }

    return Array.from(groups, ([year, yearPosts])=>({
        year, 
        posts:yearPosts
    }))
}
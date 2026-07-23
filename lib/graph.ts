import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type KnowledgeGraphNode = {
    id: string;
    name: string;
    description: string;
    group: string;
    val: number;
}

export type KnowledgeGraphLink = {
    source: string;
    target: string;
}

export type KnowledgeGraphData = {
    nodes: KnowledgeGraphNode[]
    links: KnowledgeGraphLink[]
}

const postsDirectory = path.join(
    process.cwd(),
    "content",
    "posts"
)

function extractPostLinks(content: string) {
    const matches = content.matchAll(
        /\]\(\/posts\/([^)#\s]+)(?:#[^)]*)?\)/g
    )
    return Array.from(
        matches,
        (match) => match[1]
    )
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraphData> {
    const filenames = await readdir(postsDirectory)

    const posts = await Promise.all(
        filenames
            .filter((filenames) => filenames.endsWith(".mdx"))
            .map(async (filename)=>{
                const filePath = path.join(
                    postsDirectory,
                    filename
                )
                const source = await readFile(filePath, "utf8")
                const { data, content } = matter(source)

                const slug = filename.replace(/\.mdx$/, "")

                const title =
                    typeof data.title === "string"
                        ? data.title
                        : slug;

                const description =
                    typeof data.description === "string"
                        ? data.description
                        : "";

                const tags = Array.isArray(data.tags)
                    ? data.tags.map(String)
                    : [];

                return {
                    slug,
                    title,
                    description,
                    group: tags[0] ?? "其他",
                    targets: extractPostLinks(content)
                }
            })
    )
    const existingSlugs = new Set(
        posts.map((post)=> post.slug)
    )
    const links: KnowledgeGraphLink[] = [];
    const linkKeys = new Set<string>();

    for (const post of posts) {
        for (const target of post.targets) {
            if (!existingSlugs.has(target)) {
                continue
            }

            if(target===post.slug){
                continue
            }

            const key = `${post.slug}->${target}`

            if (linkKeys.has(key)) {
                continue
            }
            linkKeys.add(key)

            links.push({
                source: post.slug,
                target
            })
        }
    }
    
    const degrees = new Map<string, number>()

    for (const post of posts) {
        degrees.set(post.slug, 0)
    }

    for (const link of links) {
        degrees.set(
            link.source,
            (degrees.get(link.source) ?? 0) +1
        )
        degrees.set(
            link.target,
            (degrees.get(link.target) ?? 0) +1
        )
    }

    const nodes: KnowledgeGraphNode[] = posts.map(
        (post) => ({
            id: post.slug,
            name: post.title,
            description: post.description,
            group: post.group,

            val: 1+(degrees.get(post.slug) ?? 0)
        })
    )
    return {
        nodes,
        links
    }
}

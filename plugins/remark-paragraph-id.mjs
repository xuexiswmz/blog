import { createHash } from "node:crypto";
import path from "node:path";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

function createParagraphHash(slug, content) {
    return createHash("sha256")
        .update(`${slug}:${content}`)
        .digest("hex")
        .slice(0,12)
}

export default function remarkParagraphId() {
    return function transformer(tree, file) {
        const sourcePath = String(
            file.path ?? "unknown.mdx"
        )

        const slug = path.basename(
            sourcePath,
            path.extname(sourcePath)
        )

        const occurrences = new Map()

        visit(tree,"paragraph",
            (node, _index, parent)=>{
                if (!parent || parent.type !== "root") {
                    return
                }

                const content = toString(node)
                    .replace(/\s+/g, " ")
                    .trim()
                
                if (!content) {
                    return
                }

                const hash = createParagraphHash(
                    slug,
                    content
                )

                const occurrence = (occurrences.get(hash) ?? 0) +1
                occurrences.set(hash, occurrence)

                const paragraphId = occurrence === 1 ? `p-${hash}` : `p-${hash}-${occurrence}`

                node.data ??={}
                node.data.hProperties ??={}

                node.data.hProperties['data-paragraph-id'] = paragraphId
            })
    }
}
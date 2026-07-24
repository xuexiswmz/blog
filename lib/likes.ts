import { sql } from "./db"

export type LikeSummary = {
    count: number
    liked: boolean
}

const EMPTY_VISITOR_ID = "00000000-0000-4000-8000-000000000000"

export async function getLikeSummaries(visitorId: string | null) {
    const comparedVisitorId = visitorId ?? EMPTY_VISITOR_ID

    const rows = await sql`
        select post_slug, count(*)::int as count,
            coalesce(
                bool_or(
                    visitor_id=${comparedVisitorId}::uuid
                ),
                false
            ) as liked
        from post_likes
        group by post_slug
    `

    const summaries = new Map<string, LikeSummary>()

    for (const row of rows) {
        summaries.set(
            String(row.post_slug),
            {
                count: Number(row.count),
                liked: Boolean(row.liked)
            }
        )
    }
    return summaries
}
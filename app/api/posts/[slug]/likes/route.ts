import { sql } from "@/lib/db"
import { getOrCreateVisitorId } from "@/lib/visitor"

type RouteContext = {
    params: Promise<{
        slug: string
    }>
}

const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function POST(
    _request: Request,
    context: RouteContext
) {
    try {
        const {slug} = await context.params

        if (!SLUG_PATTERN.test(slug)) {
            return Response.json(
                {
                    message: "文章slug不合法"
                },
                {
                    status: 400
                }
            )
        }

        const visitorId = await getOrCreateVisitorId()

        const likeResult = await sql`
            with previous_count as (
                select count(*)::int as count
                from post_likes
                where post_slug = ${slug}
            ),

            removed as (
                delete from post_likes
                where post_slug = ${slug}
                and visitor_id = ${visitorId}::uuid
                returning 1
            ),

            added as (
                insert into post_likes (
                post_slug,
                visitor_id
                )
                select
                ${slug},
                ${visitorId}::uuid
                where not exists (
                select 1 from removed
                )
                on conflict do nothing
                returning 1
            )

            select
                exists(
                select 1 from added
                ) as liked,

                (
                (select count from previous_count)
                + (select count(*)::int from added)
                - (select count(*)::int from removed)
                )::int as count
        `;

        return Response.json({
            liked: Boolean(likeResult[0].liked),
            count: Number(likeResult[0].count)
        })
    } catch (error) {
        console.error("点赞失败:",error);
        return Response.json(
            {
                message: "点赞操作失败"
            },
            {
                status: 500
            }
        )
    }
}
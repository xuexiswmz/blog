import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        })

        if (!session) {
            return Response.json(
                {
                    message: "请先登录管理员账号"
                },
                {
                    status: 401
                }
            )
        }

        const rows = await sql`
            select id,
                post_slug,
                block_id,
                root_id,
                reply_to_id,
                username,
                content,
                status,
                author_type,
                moderation_source,
                moderation_reason,
                moderation_model,
                moderated_at,
                created_at
            from paragraph_comments
            where status= 'pending'
            order by created_at asc limit 100
        `

        const comments = rows.map((row)=>({
            id: String(row.id),
            postSlug: String(row.post_slug),
            blockId: String(row.block_id),
            rootId: row.root_id ? String(row.root_id) : null,
            replyToId: row.reply_to_id ? String(row.reply_to_id) : null,
            username: String(row.username),
            content: String(row.content),
            status: String(row.status),
            authorType: String(row.author_type),
            moderationSource: row.moderation_source ? String(row.moderation_source) : null,
            moderationReason: row.moderation_reason ? String(row.moderation_reason) : null,
            moderationModel: row.moderation_model ? String(row.moderation_model) : null,
            moderatedAt: row.moderated_at ? new Date(String(row.moderated_at)).toISOString() : null,
            createdAt: new Date(String(row.created_at)).toISOString()
        }))

        return Response.json({
            comments,
            count: comments.length
        })
    } catch (error) {
        console.error("读取待审核评论失败: ", error);
        return Response.json(
            {
                message: "读取待审核评论失败"
            },
            {
                status: 500
            }
        )
    }
}
export async function PATCH(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        })

        if (!session) {
            return Response.json(
                {
                    message: "请先登录管理员账号"
                },
                {
                    status: 401
                }
            )
        }

        const rawBody = await request.json().catch(()=> null)

        if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
            return Response.json(
                {
                    message:'评论ID不合法'
                },
                {
                    status: 400
                }
            )
        }

        const body = rawBody as Record<string, unknown>
        const commentId = typeof body.commentId === "string" ? body.commentId.trim() : ""
        const action = body.action

        if (!UUID_PATTERN.test(commentId)) {
            return Response.json(
                {
                    message: "评论ID不合法"
                },
                {
                    status: 400
                }
            )
        }

        if (action !== "approve" && action !== "reject") {
            return Response.json(
                {
                    message: "审核操作不合法"
                },
                {
                    status: 400
                }
            )
        }
        
        const nextStatus = action === "approve" ? "published" : "rejected"
        const humanReason = action === "approve" ? "管理员人工通过" : "管理员人工拒绝"

        const rows = await sql`
            update paragraph_comments
            set
                status = ${nextStatus},
                moderation_source = 'human',
                moderation_reason = concat_ws(
                    '；',
                    nullif(moderation_reason, ''),
                    ${humanReason}
                ),
                moderated_at = now()
            where id = ${commentId}::uuid
                and status = 'pending'
                and deleted_at is null
            returning
                id,
                status,
                moderation_source,
                moderation_reason,
                moderated_at
        `
        const comment = rows[0]

        if (!comment) {
            return Response.json(
                {
                    message: "评论不存在或已经审核"
                },
                {
                    status: 409
                }
            )
        }

        return Response.json({
            message: action === "approve" ? "评论已通过" : "评论已拒绝",
            comment:{
                id: String(comment.id),
                status: String(comment.status),
                moderationSource: String(
                    comment.moderation_source,
                ),
                moderationReason: String(
                    comment.moderation_reason,
                ),
                moderatedAt: new Date(
                    String(comment.moderated_at),
                ).toISOString(),
            }
        })
    } catch (error) {
        console.error("审核评论失败: ", error);
        return Response.json(
            {
                message: "审核评论失败"
            },
            {
                status: 500
            }
        )
    }
}

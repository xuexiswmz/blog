import { moderateComment } from "@/lib/ai/moderate-comment";
import { sql } from "@/lib/db";
import { getOrCreateVisitorId } from "@/lib/visitor";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type CommentDto = {
  id: string;
  username: string;
  content: string;
  createdAt: string;

  rootId: string | null;
  replyToId: string | null;

  replyToUsername: string | null;
  replyToContent: string | null;

  deleted: boolean;
  replies: CommentDto[];
};

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const BLOCK_ID_PATTERN = /^p-[0-9a-f]{12}(?:-\d+)?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 平铺记录 -> 找到root id 为 null 的根评论 -> 把其他评论放入对应根评论的replies
export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);

    const blockId = url.searchParams.get("blockId")?.trim() ?? "";

    if (!SLUG_PATTERN.test(slug)) {
      return Response.json(
        {
          message: "文章slug不合法",
        },
        {
          status: 400,
        },
      );
    }

    if (!BLOCK_ID_PATTERN.test(blockId)) {
      return Response.json(
        {
          message: "段落ID不合法",
        },
        {
          status: 400,
        },
      );
    }

    const rows = await sql`
            select comment.id,
                comment.username,
                comment.content,
                comment.root_id,
                comment.reply_to_id,
                comment.created_at, 
                comment.deleted_at,
                reply_target.username as reply_to_username,
                reply_target.content as reply_to_content,
                reply_target.deleted_at as reply_to_deleted_at
            from paragraph_comments as comment

            left join paragraph_comments as reply_target on reply_target.id = comment.reply_to_id

            where comment.post_slug = ${slug} and comment.block_id = ${blockId} and comment.status = 'published'

            order by comment.created_at desc, comment.id desc
        `;

    const comments: CommentDto[] = rows.map((row) => {
      const deleted = row.deleted_at !== null;
      const replyTargetDeleted = row.reply_to_deleted_at !== null;

      return {
        id: String(row.id),
        username: deleted ? "已删除用户" : String(row.username),
        content: deleted ? "该评论已删除" : String(row.content),
        createdAt: new Date(String(row.created_at)).toISOString(),
        rootId: row.root_id ? String(row.root_id) : null,
        replyToId: row.reply_to_id ? String(row.reply_to_id) : null,
        replyToUsername:
          row.reply_to_username && !replyTargetDeleted
            ? String(row.reply_to_username)
            : null,
        replyToContent:
          row.reply_to_content && !replyTargetDeleted
            ? String(row.reply_to_content)
            : null,
        deleted,
        replies: [],
      };
    });

    // 获取所有根评论
    const rootComments = comments.filter(
      (comments) => comments.rootId === null,
    );
    const rootsById = new Map(
      rootComments.map((comment) => [comment.id, comment]),
    );

    // 回复缩进一层，保留具体回复对象
    for (const comment of comments) {
      if (!comment.rootId) {
        continue;
      }

      const rootComment = rootsById.get(comment.rootId);
      rootComment?.replies.push(comment);
    }

    const count = rootComments.reduce(
      (total, comment) =>
        total +
        (comment.deleted ? 0 : 1) +
        comment.replies.filter((reply) => !reply.deleted).length,
      0,
    );

    return Response.json({
      comments: rootComments,
      count,
    });
  } catch (error) {
    console.error("读取段评失败: ", error);
    return Response.json(
      {
        message: "读取段评失败",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!SLUG_PATTERN.test(slug)) {
      return Response.json(
        {
          message: "文章slug不合法",
        },
        {
          status: 400,
        },
      );
    }

    const rawBody = await request.json().catch(() => null);

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return Response.json(
        {
          message: "请求内容不合法",
        },
        {
          status: 400,
        },
      );
    }

    const body = rawBody as Record<string, unknown>;

    const blockId = typeof body.blockId === "string" ? body.blockId.trim() : "";
    const username =
      typeof body.username === "string"
        ? body.username.replace(/\s+/g, " ").trim()
        : "";
    const content =
      typeof body.content === "string"
        ? body.content.replace(/\r\n?/g, "\n").trim()
        : "";
    const replyToId =
      body.replyToId === undefined ||
      body.replyToId === null ||
      body.replyToId === ""
        ? null
        : typeof body.replyToId === "string"
          ? body.replyToId
          : "invalid";

    if (!BLOCK_ID_PATTERN.test(blockId)) {
      return Response.json(
        {
          message: "段落ID不合法",
        },
        {
          status: 400,
        },
      );
    }

    const usernameLength = [...username].length;

    if (usernameLength < 2 || usernameLength > 20) {
      return Response.json(
        {
          message: "用户名长度必须为 2-20 个字符",
        },
        {
          status: 400,
        },
      );
    }

    const contentLength = [...content].length;

    if (contentLength < 1 || contentLength > 1000) {
      return Response.json(
        {
          message: "评论长度必须为 1-1000 个字符",
        },
        {
          status: 400,
        },
      );
    }

    if (replyToId && !UUID_PATTERN.test(replyToId)) {
      return Response.json(
        {
          message: "回复目标不合法",
        },
        {
          status: 400,
        },
      );
    }

    const vistorId = await getOrCreateVisitorId();

    // 一个游客10s内只能提交一次
    const recentResult = await sql`
            select exists(
                select 1 from paragraph_comments where visitor_id = ${vistorId}::uuid and created_at > now() - interval '10 seconds'
            ) as too_frequent
        `;

    if (Boolean(recentResult[0].too_frequent)) {
      return Response.json(
        {
          message: "提交的太快了，请稍后再试",
        },
        {
          status: 429,
        },
      );
    }

    let rootId: string | null = null;

    // rootId由服务端查询和计算，使用replyToId回复评论
    if (replyToId) {
      const targetRows = await sql`
                select id,root_id 
                from paragraph_comments 
                where id = ${replyToId}::uuid 
                    and post_slug = ${slug}
                    and block_id = ${blockId}
                    and status = 'published'
                    and deleted_at is null
                limit 1
            `;

      const targetComment = targetRows[0];

      if (!targetComment) {
        return Response.json(
          {
            message: "要回复的评论不存在或尚未通过审核",
          },
          {
            status: 400,
          },
        );
      }

      rootId = targetComment.root_id
        ? String(targetComment.root_id)
        : String(targetComment.id);
    }

    const moderation = await moderateComment({
      username,
      content,
    });

    const nextStatus =
      moderation.decision === "publish"
        ? "published"
        : moderation.decision === "reject"
          ? "rejected"
          : "pending";

    const insertedRows = await sql`
            insert into paragraph_comments (
                post_slug, 
                block_id,
                root_id,
                reply_to_id,
                visitor_id,
                username,
                content,
                status,
                author_type,
                moderation_source,
                moderation_reason,
                moderation_model,
                moderated_at
            )
            values (${slug}, ${blockId}, ${rootId}::uuid, ${replyToId}::uuid, ${vistorId}::uuid, ${username}, ${content}, ${nextStatus},
                    'guest', 'ai', ${moderation.reason}, ${moderation.model}, now()
                )
            returning id, username, content, root_id, reply_to_id, created_at, status
        `;

    const comment = insertedRows[0];

    const responseMessage =
      nextStatus === "published"
        ? "评论已通过 AI 审核并发布"
        : nextStatus === "rejected"
          ? "评论未通过审核"
          : "评论已提交，等待人工审核";

    return Response.json(
      {
        message: responseMessage,
        comment: {
          id: String(comment.id),
          username: String(comment.username),
          content: String(comment.content),
          rootId: comment.root_id ? String(comment.root_id) : null,
          replyToId: comment.reply_to_id ? String(comment.reply_to_id) : null,
          createdAt: new Date(String(comment.created_at)).toISOString(),
          status: String(comment.status),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("提交段评失败: ", error);
    return Response.json(
      {
        message: "提交段评失败",
      },
      {
        status: 500,
      },
    );
  }
}

import { sql } from "@/lib/db";
import { readVisitorID } from "@/lib/visitor";

type RouteContext = {
  params: Promise<{
    slug: string;
    commentId: string;
  }>;
};

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { slug, commentId } = await context.params;

    if (!SLUG_PATTERN.test(slug)) {
      return Response.json(
        {
          message: "文章slug不合法",
        },
        { status: 400 },
      );
    }

    if (!UUID_PATTERN.test(commentId)) {
      return Response.json(
        {
          message: "评论id不合法",
        },
        { status: 400 },
      );
    }

    const visitorId = await readVisitorID();

    if (!visitorId) {
      return Response.json(
        {
          message: "无法确认评论身份",
        },
        {
          status: 401,
        },
      );
    }

    const rows = await sql`
        update paragraph_comments 
        set deleted_at = now()
        where id = ${commentId}::uuid
        and post_slug = ${slug}
        and visitor_id = ${visitorId}::uuid
        and deleted_at is null
        returning id
    `;

    if (rows.length === 0) {
      return Response.json(
        { message: "评论不存在或无权删除" },
        { status: 404 },
      );
    }

    return Response.json({
      message: "评论已删除",
    });
  } catch (error) {
    console.error("删除评论失败", error);
    return Response.json(
      {
        message: "删除评论失败",
      },
      {
        status: 500,
      },
    );
  }
}

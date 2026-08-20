import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
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

    const rows = await sql`
        select 
            block_id,count(*)::int as comment_count
        from paragraph_comments
        where post_slug = ${slug}
          and status = 'published'
          and deleted_at is null
        group by block_id
    `;

    const counts: Record<string, number> = {};

    for (const row of rows) {
      counts[String(row.block_id)] = Number(row.comment_count);
    }

    return Response.json({ counts });
  } catch (error) {
    console.error("读取段评数量失败", error);
    return Response.json(
      {
        message: "读取段评数量失败",
      },
      {
        status: 500,
      },
    );
  }
}

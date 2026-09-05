import { recordArticleVisit } from "@/lib/analytics/repositories/articleVisitRepository";
import { auth } from "@/lib/auth";
import { postExists } from "@/lib/posts";
import { getOrCreateVisitorId } from "@/lib/visitor";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!SLUG_PATTERN.test(slug)) {
      return Response.json({ message: "文章 slug 不合法" }, { status: 400 });
    }

    if (!(await postExists(slug))) {
      return Response.json({ message: "文章不存在" }, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (session) {
      return new Response(null, { status: 204 });
    }

    const visitorId = await getOrCreateVisitorId();
    await recordArticleVisit(visitorId, slug);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("记录文章访问失败:", error);
    return Response.json({ message: "记录文章访问失败" }, { status: 500 });
  }
}

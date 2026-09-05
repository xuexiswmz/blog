import { parseAnalyticsRange } from "@/lib/analytics/range";
import { getAnalyticsVisitorDetail } from "@/lib/analytics/services/analyticsService";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStoreHeaders = { "Cache-Control": "no-store" };

type RouteContext = {
  params: Promise<{ visitorId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { message: "请先登录管理员账号" },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const range = parseAnalyticsRange(
      new URL(request.url).searchParams.get("range"),
    );
    if (!range) {
      return Response.json(
        { message: "统计范围不合法" },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const { visitorId } = await context.params;
    if (!UUID_PATTERN.test(visitorId)) {
      return Response.json(
        { message: "访客 ID 不合法" },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const visitor = await getAnalyticsVisitorDetail(range, visitorId);
    if (!visitor) {
      return Response.json(
        { message: "访客记录不存在" },
        { status: 404, headers: noStoreHeaders },
      );
    }

    return Response.json(visitor, { headers: noStoreHeaders });
  } catch (error) {
    console.error("读取访客详情失败:", error);
    return Response.json(
      { message: "读取访客详情失败" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

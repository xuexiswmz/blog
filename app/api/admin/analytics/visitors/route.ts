import {
  parseAnalyticsPagination,
  parseAnalyticsRange,
} from "@/lib/analytics/range";
import { getAnalyticsVisitors } from "@/lib/analytics/services/analyticsService";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { message: "请先登录管理员账号" },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const range = parseAnalyticsRange(searchParams.get("range"));
    if (!range) {
      return Response.json(
        { message: "统计范围不合法" },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const pagination = parseAnalyticsPagination(
      searchParams.get("page"),
      searchParams.get("pageSize"),
    );
    if (!pagination) {
      return Response.json(
        { message: "分页参数不合法" },
        { status: 400, headers: noStoreHeaders },
      );
    }

    return Response.json(
      await getAnalyticsVisitors(range, pagination.page, pagination.pageSize),
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error("读取访客统计失败:", error);
    return Response.json(
      { message: "读取访客统计失败" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

import { auth } from "@/lib/auth";
import { toTextAnnotationDto } from "@/lib/text-annotations/mappers/textAnnotationMapper";
import { listTextAnnotations } from "@/lib/text-annotations/repositories/textAnnotationRepository";
import { createTextAnnotation } from "@/lib/text-annotations/services/textAnnotationService";
import {
  isValidPostSlug,
  parseCreateTextAnnotation,
} from "@/lib/text-annotations/validators/textAnnotationValidator";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasDatabaseErrorCode(error: unknown, expectedCode: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === expectedCode
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!isValidPostSlug(slug)) {
      return Response.json(
        {
          message: "文章slug不合法",
        },
        {
          status: 400,
        },
      );
    }

    const rows = await listTextAnnotations(slug);

    return Response.json({
      annotations: rows.map(toTextAnnotationDto),
    });
  } catch (error) {
    console.error("读取文章画线失败", error);

    return Response.json(
      {
        message: "读取文章画线失败",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return Response.json(
        {
          message: "只有管理员可以添加画线",
        },
        {
          status: 401,
        },
      );
    }

    const { slug } = await context.params;

    if (!isValidPostSlug(slug)) {
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

    const parsed = parseCreateTextAnnotation(rawBody);

    if (!parsed.success) {
      return Response.json(
        {
          message: parsed.message,
        },
        {
          status: 400,
        },
      );
    }

    const result = await createTextAnnotation(slug, parsed.data);

    if (!result.success) {
      return Response.json(
        {
          message: "画线范围已经变化，请刷新后重试",
          mergedRange: result.mergedRange,
        },
        {
          status: 409,
        },
      );
    }

    return Response.json(
      {
        annotation: result.annotation,
        replacedIds: result.replacedIds,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    // PostgreSQL exclusion constraint 冲突。
    if (hasDatabaseErrorCode(error, "23P01")) {
      return Response.json(
        {
          message: "画线范围已经变化，请刷新后重试",
        },
        {
          status: 409,
        },
      );
    }

    console.error("添加文章画线失败", error);

    return Response.json(
      {
        message: "添加文章画线失败",
      },
      {
        status: 500,
      },
    );
  }
}

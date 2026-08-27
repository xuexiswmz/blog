import { auth } from "@/lib/auth";
import { toTextAnnotationDto } from "@/lib/text-annotations/mappers/textAnnotationMapper";
import {
  deleteTextAnnotation,
  updateTextAnnotation,
} from "@/lib/text-annotations/repositories/textAnnotationRepository";
import {
  isValidAnnotationId,
  isValidPostSlug,
  parseUpdateTextAnnotation,
} from "@/lib/text-annotations/validators/textAnnotationValidator";

type RouteContext = {
  params: Promise<{
    slug: string;
    annotationId: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return Response.json(
        {
          message: "只有管理员可以修改画线",
        },
        {
          status: 401,
        },
      );
    }

    const { slug, annotationId } = await context.params;

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

    if (!isValidAnnotationId(annotationId)) {
      return Response.json(
        {
          message: "画线ID不合法",
        },
        {
          status: 400,
        },
      );
    }

    const rawBody = await request.json().catch(() => null);

    const parsed = parseUpdateTextAnnotation(rawBody);

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

    const row = await updateTextAnnotation(slug, annotationId, parsed.data);

    if (!row) {
      return Response.json(
        {
          message: "画线不存在",
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      annotation: toTextAnnotationDto(row),
    });
  } catch (error) {
    console.error("修改文章画线失败", error);

    return Response.json(
      {
        message: "修改文章画线失败",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return Response.json(
        {
          message: "只有管理员可以删除画线",
        },
        {
          status: 401,
        },
      );
    }

    const { slug, annotationId } = await context.params;

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

    if (!isValidAnnotationId(annotationId)) {
      return Response.json(
        {
          message: "画线ID不合法",
        },
        {
          status: 400,
        },
      );
    }

    const deleted = await deleteTextAnnotation(slug, annotationId);

    if (!deleted) {
      return Response.json(
        {
          message: "画线不存在",
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      message: "画线已删除",
    });
  } catch (error) {
    console.error("删除文章画线失败", error);

    return Response.json(
      {
        message: "删除文章画线失败",
      },
      {
        status: 500,
      },
    );
  }
}

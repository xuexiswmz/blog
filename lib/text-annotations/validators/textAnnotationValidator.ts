import type {
  CreateTextAnnotationInput,
  TextAnnotationColor,
  TextAnnotationLineStyle,
  UpdateTextAnnotationInput,
  ValidationResult,
} from "../types/textAnnotation";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const PARAGRAPH_ID_PATTERN = /^p-[0-9a-f]{12}(?:-\d+)?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LINE_STYLES = new Set(["solid", "double", "wavy"]);

const COLORS = new Set(["amber", "rose", "sky", "emerald", "violet"]);

export function isValidPostSlug(slug: string) {
  return SLUG_PATTERN.test(slug);
}

export function isValidAnnotationId(id: string) {
  return UUID_PATTERN.test(id);
}

export function parseCreateTextAnnotation(
  rawBody: unknown,
): ValidationResult<CreateTextAnnotationInput> {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return {
      success: false,
      message: "请求内容不合法",
    };
  }

  const body = rawBody as Record<string, unknown>;

  const paragraphId =
    typeof body.paragraphId === "string" ? body.paragraphId.trim() : "";

  const selectedText =
    typeof body.selectedText === "string" ? body.selectedText : "";

  const startOffset = body.startOffset;
  const endOffset = body.endOffset;
  const lineStyle = body.lineStyle;
  const color = body.color;

  if (!PARAGRAPH_ID_PATTERN.test(paragraphId)) {
    return {
      success: false,
      message: "段落ID不合法",
    };
  }

  if (
    !Number.isSafeInteger(startOffset) ||
    !Number.isSafeInteger(endOffset) ||
    Number(startOffset) < 0 ||
    Number(endOffset) <= Number(startOffset)
  ) {
    return {
      success: false,
      message: "画线范围不合法",
    };
  }

  if (
    selectedText.length === 0 ||
    selectedText.length !== Number(endOffset) - Number(startOffset)
  ) {
    return {
      success: false,
      message: "画线文字与范围不匹配",
    };
  }

  if (typeof lineStyle !== "string" || !LINE_STYLES.has(lineStyle)) {
    return {
      success: false,
      message: "画线类型不合法",
    };
  }

  if (typeof color !== "string" || !COLORS.has(color)) {
    return {
      success: false,
      message: "画线颜色不合法",
    };
  }

  return {
    success: true,
    data: {
      paragraphId,
      startOffset: Number(startOffset),
      endOffset: Number(endOffset),
      selectedText,
      lineStyle: lineStyle as TextAnnotationLineStyle,
      color: color as TextAnnotationColor,
    },
  };
}

export function parseUpdateTextAnnotation(
  rawBody: unknown,
): ValidationResult<UpdateTextAnnotationInput> {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return {
      success: false,
      message: "请求内容不合法",
    };
  }

  const body = rawBody as Record<string, unknown>;

  if (typeof body.lineStyle !== "string" || !LINE_STYLES.has(body.lineStyle)) {
    return {
      success: false,
      message: "画线类型不合法",
    };
  }

  if (typeof body.color !== "string" || !COLORS.has(body.color)) {
    return {
      success: false,
      message: "画线颜色不合法",
    };
  }

  return {
    success: true,
    data: {
      lineStyle: body.lineStyle as TextAnnotationLineStyle,
      color: body.color as TextAnnotationColor,
    },
  };
}

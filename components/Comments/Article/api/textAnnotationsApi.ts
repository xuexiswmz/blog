import type {
  CreateTextAnnotationResponse,
  DeleteTextAnnotationResponse,
  NewTextAnnotation,
  TextAnnotation,
  TextAnnotationsResponse,
  UpdateTextAnnotation,
  UpdateTextAnnotationResponse,
} from "../../Comment/types";

function getTextAnnotationsUrl(postSlug: string) {
  return `/api/posts/${encodeURIComponent(postSlug)}/text-annotations`;
}

function getTextAnnotationUrl(postSlug: string, annotationId: string) {
  return `${getTextAnnotationsUrl(postSlug)}/${encodeURIComponent(annotationId)}`;
}

export async function requestTextAnnotations(
  postSlug: string,
  signal?: AbortSignal,
): Promise<TextAnnotation[]> {
  const response = await fetch(getTextAnnotationsUrl(postSlug), {
    method: "GET",
    cache: "no-cache",
    signal,
  });

  const result = (await response.json()) as TextAnnotationsResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "获取文章画线失败");
  }

  return result.annotations;
}

export async function createTextAnnotation(
  postSlug: string,
  input: NewTextAnnotation,
): Promise<CreateTextAnnotationResponse> {
  const response = await fetch(getTextAnnotationsUrl(postSlug), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as CreateTextAnnotationResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "添加文章画线失败");
  }

  return result;
}

export async function updateTextAnnotation(
  postSlug: string,
  annotationId: string,
  input: UpdateTextAnnotation,
) {
  const response = await fetch(getTextAnnotationUrl(postSlug, annotationId), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as UpdateTextAnnotationResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "修改文章画线失败");
  }

  return result.annotation;
}

export async function deleteTextAnnotation(
  postSlug: string,
  annotationId: string,
): Promise<void> {
  const response = await fetch(getTextAnnotationUrl(postSlug, annotationId), {
    method: "DELETE",
  });

  const result = (await response.json()) as DeleteTextAnnotationResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "删除文章画线失败");
  }
}

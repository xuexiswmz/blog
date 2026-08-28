import type {
  CreateTextAnnotationResponse,
  NewTextAnnotation,
  TextAnnotation,
  TextAnnotationsResponse,
} from "../../Comment/types";

function getTextAnnotationsUrl(postSlug: string) {
  return `/api/posts/${encodeURIComponent(postSlug)}/text-annotations`;
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

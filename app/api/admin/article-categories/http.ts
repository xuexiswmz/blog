import { auth } from "@/lib/auth";
import { isSafePostSlug } from "@/lib/articleCategories/postSlug";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAdmin(request: Request): Promise<Response | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) return null;
  return jsonResponse({ message: "请先登录管理员账号" }, 401);
}

export async function readObjectBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

export function hasExactKeys(
  body: Record<string, unknown>,
  keys: string[],
): boolean {
  const actualKeys = Object.keys(body).sort();
  const expectedKeys = [...keys].sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

export function serviceErrorResponse(
  error: unknown,
  fallbackMessage: string,
): Response {
  const candidate = error as { status?: unknown; message?: unknown };
  const status =
    typeof candidate?.status === "number" &&
    candidate.status >= 400 &&
    candidate.status <= 599
      ? candidate.status
      : 500;
  const message =
    typeof candidate?.message === "string" && candidate.message
      ? candidate.message
      : fallbackMessage;
  return jsonResponse({ message }, status);
}

export function decodeSlug(value: string): string | null {
  try {
    const slug = decodeURIComponent(value);
    return isSafePostSlug(slug) ? slug : null;
  } catch {
    return null;
  }
}

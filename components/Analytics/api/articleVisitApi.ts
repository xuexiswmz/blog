const VISIT_TRACKING_LOCK_NAME = "blog-article-visit-tracking";

let fallbackVisitQueue: Promise<void> = Promise.resolve();

async function postArticleVisit(postSlug: string) {
  await fetch(`/api/posts/${encodeURIComponent(postSlug)}/visits`, {
    method: "POST",
    cache: "no-store",
    keepalive: true,
  });
}

async function serializeArticleVisit(task: () => Promise<void>) {
  // The HttpOnly visitor cookie is committed by the first response. An
  // origin-wide Web Lock keeps other tabs from racing that bootstrap.
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(VISIT_TRACKING_LOCK_NAME, task);
    return;
  }

  const request = fallbackVisitQueue.then(task, task);
  fallbackVisitQueue = request.catch(() => undefined);
  await request;
}

export async function trackArticleVisit(postSlug: string): Promise<void> {
  try {
    await serializeArticleVisit(() => postArticleVisit(postSlug));
  } catch {
    // Analytics must never interrupt reading.
  }
}

export async function trackArticleVisit(postSlug: string): Promise<void> {
  try {
    await fetch(`/api/posts/${encodeURIComponent(postSlug)}/visits`, {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // Analytics must never interrupt reading.
  }
}

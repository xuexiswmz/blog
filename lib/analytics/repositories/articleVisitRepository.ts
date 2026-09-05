import { getVisitWindowStart } from "@/lib/analytics/visitWindow";
import { sql } from "@/lib/db";

export async function recordArticleVisit(
  visitorId: string,
  postSlug: string,
  now = new Date(),
): Promise<boolean> {
  const visitWindow = getVisitWindowStart(now);
  const rows = await sql`
    insert into article_visits (
      visitor_id,
      post_slug,
      visited_at,
      visit_window
    )
    values (
      ${visitorId}::uuid,
      ${postSlug},
      ${now.toISOString()}::timestamptz,
      ${visitWindow.toISOString()}::timestamptz
    )
    on conflict (visitor_id, post_slug, visit_window) do nothing
    returning id
  `;

  return rows.length === 1;
}

import { getVisitWindowStart } from "@/lib/analytics/visitWindow";
import type { AnalyticsRange } from "@/lib/analytics/types";
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

export async function getOverviewSummary(range: AnalyticsRange) {
  const rows = await sql`
    with filtered as (
      select visitor_id, post_slug, visited_at
      from article_visits
      where (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
        and visited_at <= ${range.end.toISOString()}::timestamptz
    ), visitor_counts as (
      select visitor_id, count(*)::int as visits
      from filtered
      group by visitor_id
    )
    select
      count(distinct visitor_id)::int as unique_visitors,
      count(*)::int as page_views,
      count(distinct post_slug)::int as visited_posts,
      (select count(*)::int from visitor_counts where visits > 1)
        as returning_visitors
    from filtered
  `;

  return rows[0];
}

export async function getOverviewTrend(range: AnalyticsRange) {
  return sql`
    select
      to_char(visited_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD') as date,
      count(distinct visitor_id)::int as unique_visitors,
      count(*)::int as page_views
    from article_visits
    where (${range.start?.toISOString() ?? null}::timestamptz is null
      or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    group by 1
    order by 1
  `;
}

export async function getTopPosts(range: AnalyticsRange) {
  return sql`
    select
      post_slug,
      count(distinct visitor_id)::int as unique_visitors,
      count(*)::int as page_views
    from article_visits
    where (${range.start?.toISOString() ?? null}::timestamptz is null
      or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    group by post_slug
    order by page_views desc, unique_visitors desc, post_slug asc
    limit 10
  `;
}

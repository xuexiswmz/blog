import { getVisitWindowStart } from "@/lib/analytics/visitWindow";
import type { AnalyticsRange } from "@/lib/analytics/types";
import { sql } from "@/lib/db";

export type VisitorPageRow = {
  visitor_id: string;
  first_visited_at: string;
  last_visited_at: string;
  page_views: number | string;
  visited_posts: number | string;
  favorite_post_slug: string | null;
  favorite_post_views: number | string | null;
};

export type VisitorSummaryRow = {
  first_visited_at: string;
  last_visited_at: string;
  page_views: number | string;
  visited_posts: number | string;
};

export type VisitorPostRow = {
  post_slug: string;
  page_views: number | string;
  last_visited_at: string;
};

export type RecentVisitRow = {
  post_slug: string;
  visited_at: string;
};

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

export async function getVisitorCount(range: AnalyticsRange): Promise<number> {
  const rows = await sql`
    select count(distinct visitor_id)::int as total
    from article_visits
    where (${range.start?.toISOString() ?? null}::timestamptz is null
      or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
  `;
  return Number(rows[0]?.total ?? 0);
}

export async function getVisitorPageRows(
  range: AnalyticsRange,
  limit: number,
  offset: number,
): Promise<VisitorPageRow[]> {
  const rows = await sql`
    with filtered as (
      select visitor_id, post_slug, visited_at
      from article_visits
      where (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
        and visited_at <= ${range.end.toISOString()}::timestamptz
    ), visitor_page as (
      select
        visitor_id,
        min(visited_at) as first_visited_at,
        max(visited_at) as last_visited_at,
        count(*)::int as page_views,
        count(distinct post_slug)::int as visited_posts
      from filtered
      group by visitor_id
      order by last_visited_at desc, visitor_id asc
      limit ${limit}
      offset ${offset}
    ), post_counts as (
      select
        filtered.visitor_id,
        filtered.post_slug,
        count(*)::int as page_views,
        max(filtered.visited_at) as last_visited_at
      from filtered
      inner join visitor_page using (visitor_id)
      group by filtered.visitor_id, filtered.post_slug
    ), post_preferences as (
      select
        post_counts.*,
        row_number() over (
          partition by visitor_id
          order by page_views desc, last_visited_at desc, post_slug asc
        ) as preference_rank
      from post_counts
    )
    select
      visitor_page.visitor_id,
      visitor_page.first_visited_at,
      visitor_page.last_visited_at,
      visitor_page.page_views,
      visitor_page.visited_posts,
      post_preferences.post_slug as favorite_post_slug,
      post_preferences.page_views as favorite_post_views
    from visitor_page
    left join post_preferences
      on post_preferences.visitor_id = visitor_page.visitor_id
      and post_preferences.preference_rank = 1
    order by visitor_page.last_visited_at desc, visitor_page.visitor_id asc
  `;

  return rows as VisitorPageRow[];
}

export async function getVisitorSummary(
  range: AnalyticsRange,
  visitorId: string,
): Promise<VisitorSummaryRow | null> {
  const rows = await sql`
    select
      min(visited_at) as first_visited_at,
      max(visited_at) as last_visited_at,
      count(*)::int as page_views,
      count(distinct post_slug)::int as visited_posts
    from article_visits
    where visitor_id = ${visitorId}::uuid
      and (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    having count(*) > 0
  `;

  return (rows[0] as VisitorSummaryRow | undefined) ?? null;
}

export async function getVisitorPostRows(
  range: AnalyticsRange,
  visitorId: string,
): Promise<VisitorPostRow[]> {
  const rows = await sql`
    select
      post_slug,
      count(*)::int as page_views,
      max(visited_at) as last_visited_at
    from article_visits
    where visitor_id = ${visitorId}::uuid
      and (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    group by post_slug
    order by page_views desc, last_visited_at desc, post_slug asc
  `;

  return rows as VisitorPostRow[];
}

export async function getRecentVisitorRows(
  range: AnalyticsRange,
  visitorId: string,
  limit: number,
): Promise<RecentVisitRow[]> {
  const rows = await sql`
    select post_slug, visited_at
    from article_visits
    where visitor_id = ${visitorId}::uuid
      and (${range.start?.toISOString() ?? null}::timestamptz is null
        or visited_at >= ${range.start?.toISOString() ?? null}::timestamptz)
      and visited_at <= ${range.end.toISOString()}::timestamptz
    order by visited_at desc, id desc
    limit ${Math.min(limit, 100)}
  `;

  return rows as RecentVisitRow[];
}

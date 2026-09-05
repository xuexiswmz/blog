create table if not exists article_visits (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  post_slug text not null,
  visited_at timestamptz not null default now(),
  visit_window timestamptz not null default (
    to_timestamp(
      floor(extract(epoch from now()) / 1800) * 1800
    )
  ),

  constraint article_visits_post_slug
    check (post_slug <> ''),

  constraint article_visits_window_unique
    unique (visitor_id, post_slug, visit_window)
);

create index if not exists article_visits_visited_at_idx
on article_visits (visited_at desc);

create index if not exists article_visits_post_time_idx
on article_visits (post_slug, visited_at desc);

create index if not exists article_visits_visitor_time_idx
on article_visits (visitor_id, visited_at desc);

create table if not exists article_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint article_categories_name_trimmed
    check (name = btrim(name) and char_length(name) > 0),
  constraint article_categories_position_nonnegative
    check (position >= 0)
);

create unique index if not exists article_categories_name_unique_idx
on article_categories (lower(name));

create index if not exists article_categories_position_idx
on article_categories (position, id);

create table if not exists article_category_assignments (
  post_slug text primary key,
  category_id uuid not null references article_categories(id) on delete restrict,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint article_category_assignments_slug_nonempty
    check (post_slug = btrim(post_slug) and char_length(post_slug) > 0),
  constraint article_category_assignments_position_nonnegative
    check (position >= 0)
);

create index if not exists article_category_assignments_category_position_idx
on article_category_assignments (category_id, position, post_slug);

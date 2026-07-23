create table if not exists post_likes (
  post_slug text not null,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),

  primary key (post_slug, visitor_id)
);

create index if not exists post_likes_slug_idx
on post_likes(post_slug);


create table if not exists paragraph_comments (
  id uuid primary key default gen_random_uuid(),

  post_slug text not null,
  block_id text not null,

  root_id uuid references paragraph_comments(id),
  reply_to_id uuid references paragraph_comments(id),

  visitor_id uuid not null,

  username varchar(20) not null,
  content text not null,

  status text not null default 'pending',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),

  constraint paragraph_comments_username_length
    check (
      char_length(username) >= 2
      and char_length(username) <= 20
    ),

  constraint paragraph_comments_content_length
    check (
      char_length(content) >= 1
      and char_length(content) <= 1000
    ),

  constraint paragraph_comments_status
    check (
      status in (
        'pending',
        'published',
        'rejected'
      )
    ),

  constraint paragraph_comments_reply_shape
    check (
      (
        root_id is null
        and reply_to_id is null
      )
      or
      (
        root_id is not null
        and reply_to_id is not null
      )
    )
);

create index if not exists paragraph_comments_block_idx
on paragraph_comments(
  post_slug,
  block_id,
  created_at
);

create index if not exists paragraph_comments_root_idx
on paragraph_comments(
  root_id,
  created_at
);

create index if not exists paragraph_comments_reply_to_idx
on paragraph_comments(reply_to_id);
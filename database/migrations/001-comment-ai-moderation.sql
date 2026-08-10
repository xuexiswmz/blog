begin;

-- AI 作者和审核记录
alter table paragraph_comments
  add column if not exists author_type text not null default 'guest',
  add column if not exists moderation_source text,
  add column if not exists moderation_reason text,
  add column if not exists moderation_model text,
  add column if not exists moderation_confidence numeric(4, 3),
  add column if not exists moderated_at timestamptz,
  add column if not exists generation_model text;

-- AI 和管理员评论没有游客 ID
alter table paragraph_comments
  alter column visitor_id drop not null;

-- 现有数据全部是游客评论
update paragraph_comments
set author_type = 'guest'
where author_type is null;

-- 现有已审核评论都是人工审核
update paragraph_comments
set
  moderation_source = 'human',
  moderated_at = coalesce(moderated_at, created_at)
where status in ('published', 'rejected')
  and moderation_source is null;

-- 作者类型约束
alter table paragraph_comments
  drop constraint if exists paragraph_comments_author_type;

alter table paragraph_comments
  add constraint paragraph_comments_author_type
  check (
    author_type in (
      'guest',
      'ai',
      'admin'
    )
  );

-- 审核来源约束
alter table paragraph_comments
  drop constraint if exists paragraph_comments_moderation_source;

alter table paragraph_comments
  add constraint paragraph_comments_moderation_source
  check (
    moderation_source is null
    or moderation_source in (
      'ai',
      'human'
    )
  );

-- 置信度只能是 0 到 1
alter table paragraph_comments
  drop constraint if exists paragraph_comments_moderation_confidence;

alter table paragraph_comments
  add constraint paragraph_comments_moderation_confidence
  check (
    moderation_confidence is null
    or (
      moderation_confidence >= 0
      and moderation_confidence <= 1
    )
  );

-- 游客必须有 visitor_id，AI 和管理员不能冒充游客
alter table paragraph_comments
  drop constraint if exists paragraph_comments_author_identity;

alter table paragraph_comments
  add constraint paragraph_comments_author_identity
  check (
    (
      author_type = 'guest'
      and visitor_id is not null
    )
    or
    (
      author_type in ('ai', 'admin')
      and visitor_id is null
    )
  );

-- 加速后台审核列表
create index if not exists paragraph_comments_moderation_queue_idx
on paragraph_comments (
  status,
  created_at
);

-- 加速文章所有段落的评论数量查询
create index if not exists paragraph_comments_public_counts_idx
on paragraph_comments (
  post_slug,
  block_id
)
where status = 'published'
  and deleted_at is null;

commit;
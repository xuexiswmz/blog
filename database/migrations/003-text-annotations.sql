create extension if not exists btree_gist;

create table text_annotations (
  id uuid primary key default gen_random_uuid(),

  post_slug text not null,
  paragraph_id text not null,

  start_offset integer not null,
  end_offset integer not null,
  selected_text text not null,

  line_style text not null,
  color text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint text_annotations_offsets
    check (
      start_offset >= 0
      and end_offset > start_offset
    ),

  constraint text_annotations_selected_text
    check (selected_text <> ''),

  constraint text_annotations_line_style
    check (
      line_style in (
        'solid',
        'double',
        'wavy'
      )
    ),

  constraint text_annotations_color
    check (
      color in (
        'amber',
        'rose',
        'sky',
        'emerald',
        'violet'
      )
    ),

  -- end_offset + 1 让 10-20 和 20-30 也被视为冲突。
  constraint text_annotations_no_overlap_or_touch
    exclude using gist (
      post_slug with =,
      paragraph_id with =,
      (int4range(start_offset, end_offset + 1, '[)')) with &&
    )
);

create index text_annotations_post_idx
on text_annotations (
  post_slug,
  paragraph_id,
  start_offset
);
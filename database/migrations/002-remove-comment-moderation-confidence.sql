begin;

alter table paragraph_comments
  drop constraint if exists paragraph_comments_moderation_confidence;

alter table paragraph_comments
  drop column if exists moderation_confidence;

commit;

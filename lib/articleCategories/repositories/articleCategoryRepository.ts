import { sql } from "@/lib/db";
import type {
  ArticleCategoryAssignmentRecord,
  ArticleCategoryRecord,
} from "../types";

export type ArticleCategoryRepositoryErrorCode =
  | "duplicate_name"
  | "category_in_use"
  | "missing_category"
  | "storage";

export class ArticleCategoryRepositoryError extends Error {
  constructor(
    public readonly code: ArticleCategoryRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArticleCategoryRepositoryError";
  }
}

type DatabaseError = Error & { code?: string; constraint?: string };

function translateDatabaseError(
  error: unknown,
  fallbackCode: ArticleCategoryRepositoryErrorCode = "storage",
): ArticleCategoryRepositoryError {
  const databaseError = error as DatabaseError;

  if (databaseError?.code === "23505") {
    return new ArticleCategoryRepositoryError(
      "duplicate_name",
      "分类名称已存在",
      { cause: error },
    );
  }

  if (databaseError?.code === "23503") {
    const code =
      fallbackCode === "missing_category" ? "missing_category" : "category_in_use";
    return new ArticleCategoryRepositoryError(
      code,
      code === "missing_category" ? "分类不存在" : "分类中仍有文章",
      { cause: error },
    );
  }

  return new ArticleCategoryRepositoryError(
    fallbackCode,
    "文章分类数据库操作失败",
    { cause: error },
  );
}

export async function readArticleCategoryConfiguration(): Promise<{
  categories: ArticleCategoryRecord[];
  assignments: ArticleCategoryAssignmentRecord[];
}> {
  try {
    const [categoryRows, assignmentRows] = await Promise.all([
      sql`
        select id, name, position
        from article_categories
        order by position asc, name asc, id asc
      `,
      sql`
        select post_slug, category_id, position
        from article_category_assignments
        order by category_id asc, position asc, post_slug asc
      `,
    ]);

    return {
      categories: categoryRows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        position: Number(row.position),
      })),
      assignments: assignmentRows.map((row) => ({
        postSlug: String(row.post_slug),
        categoryId: String(row.category_id),
        position: Number(row.position),
      })),
    };
  } catch (error) {
    throw translateDatabaseError(error);
  }
}

export async function insertArticleCategory(name: string): Promise<void> {
  try {
    await sql.transaction((transaction) => [
      transaction`select pg_advisory_xact_lock(hashtext('article-categories'))`,
      transaction`
        insert into article_categories (name, position)
        values (
          ${name},
          (select coalesce(max(position), -1) + 1 from article_categories)
        )
      `,
    ]);
  } catch (error) {
    throw translateDatabaseError(error);
  }
}

export async function updateArticleCategoryName(
  categoryId: string,
  name: string,
): Promise<void> {
  try {
    const rows = await sql`
      update article_categories
      set name = ${name}, updated_at = now()
      where id = ${categoryId}::uuid
      returning id
    `;
    if (rows.length === 0) {
      throw new ArticleCategoryRepositoryError(
        "missing_category",
        "分类不存在",
      );
    }
  } catch (error) {
    if (error instanceof ArticleCategoryRepositoryError) throw error;
    throw translateDatabaseError(error);
  }
}

export async function removeArticleCategory(categoryId: string): Promise<void> {
  try {
    const results = await sql.transaction((transaction) => [
      transaction`select pg_advisory_xact_lock(hashtext('article-categories'))`,
      transaction`
        delete from article_categories
        where id = ${categoryId}::uuid
        returning id
      `,
      transaction`
        with ranked as (
          select id, row_number() over (order by position, name, id) - 1 as next_position
          from article_categories
        )
        update article_categories as category
        set position = ranked.next_position, updated_at = now()
        from ranked
        where category.id = ranked.id and category.position <> ranked.next_position
      `,
    ]);
    if (results[1].length === 0) {
      throw new ArticleCategoryRepositoryError(
        "missing_category",
        "分类不存在",
      );
    }
  } catch (error) {
    if (error instanceof ArticleCategoryRepositoryError) throw error;
    throw translateDatabaseError(error, "category_in_use");
  }
}

export async function putArticleCategoryAssignment(
  postSlug: string,
  categoryId: string,
): Promise<void> {
  try {
    await sql.transaction((transaction) => [
      transaction`select pg_advisory_xact_lock(hashtext('article-categories'))`,
      transaction`
        insert into article_category_assignments (
          post_slug,
          category_id,
          position
        )
        values (
          ${postSlug},
          ${categoryId}::uuid,
          (
            select coalesce(max(position), -1) + 1
            from article_category_assignments
            where category_id = ${categoryId}::uuid
          )
        )
        on conflict (post_slug) do update
        set
          category_id = excluded.category_id,
          position = case
            when article_category_assignments.category_id = excluded.category_id
              then article_category_assignments.position
            else excluded.position
          end,
          updated_at = now()
      `,
      transaction`
        with ranked as (
          select
            post_slug,
            row_number() over (
              partition by category_id
              order by position, post_slug
            ) - 1 as next_position
          from article_category_assignments
        )
        update article_category_assignments as assignment
        set position = ranked.next_position, updated_at = now()
        from ranked
        where assignment.post_slug = ranked.post_slug
          and assignment.position <> ranked.next_position
      `,
    ]);
  } catch (error) {
    throw translateDatabaseError(error, "missing_category");
  }
}

export async function removeArticleCategoryAssignment(
  postSlug: string,
): Promise<void> {
  try {
    await sql.transaction((transaction) => [
      transaction`select pg_advisory_xact_lock(hashtext('article-categories'))`,
      transaction`
        delete from article_category_assignments
        where post_slug = ${postSlug}
      `,
      transaction`
        with ranked as (
          select
            post_slug,
            row_number() over (
              partition by category_id
              order by position, post_slug
            ) - 1 as next_position
          from article_category_assignments
        )
        update article_category_assignments as assignment
        set position = ranked.next_position, updated_at = now()
        from ranked
        where assignment.post_slug = ranked.post_slug
          and assignment.position <> ranked.next_position
      `,
    ]);
  } catch (error) {
    throw translateDatabaseError(error);
  }
}

export async function shiftArticleCategory(
  categoryId: string,
  direction: "up" | "down",
): Promise<boolean> {
  const offset = direction === "up" ? -1 : 1;

  try {
    const results = await sql.transaction((transaction) => [
      transaction`select pg_advisory_xact_lock(hashtext('article-categories'))`,
      transaction`
        with ranked as (
          select id, row_number() over (order by position, name, id) - 1 as next_position
          from article_categories
        )
        update article_categories as category
        set position = ranked.next_position, updated_at = now()
        from ranked
        where category.id = ranked.id and category.position <> ranked.next_position
      `,
      transaction`
        with target as (
          select id, position
          from article_categories
          where id = ${categoryId}::uuid
        ), neighbor as (
          select category.id, category.position
          from article_categories as category, target
          where category.position = target.position + ${offset}
        ), swapped as (
          update article_categories as category
          set
            position = case
              when category.id = target.id then neighbor.position
              else target.position
            end,
            updated_at = now()
          from target, neighbor
          where category.id in (target.id, neighbor.id)
          returning category.id
        )
        select id from swapped
      `,
    ]);

    return results[2].length === 2;
  } catch (error) {
    throw translateDatabaseError(error);
  }
}

export async function shiftArticleCategoryAssignment(
  postSlug: string,
  direction: "up" | "down",
): Promise<boolean> {
  const offset = direction === "up" ? -1 : 1;

  try {
    const results = await sql.transaction((transaction) => [
      transaction`select pg_advisory_xact_lock(hashtext('article-categories'))`,
      transaction`
        with ranked as (
          select
            post_slug,
            row_number() over (
              partition by category_id
              order by position, post_slug
            ) - 1 as next_position
          from article_category_assignments
        )
        update article_category_assignments as assignment
        set position = ranked.next_position, updated_at = now()
        from ranked
        where assignment.post_slug = ranked.post_slug
          and assignment.position <> ranked.next_position
      `,
      transaction`
        with target as (
          select post_slug, category_id, position
          from article_category_assignments
          where post_slug = ${postSlug}
        ), neighbor as (
          select assignment.post_slug, assignment.position
          from article_category_assignments as assignment, target
          where assignment.category_id = target.category_id
            and assignment.position = target.position + ${offset}
        ), swapped as (
          update article_category_assignments as assignment
          set
            position = case
              when assignment.post_slug = target.post_slug then neighbor.position
              else target.position
            end,
            updated_at = now()
          from target, neighbor
          where assignment.post_slug in (target.post_slug, neighbor.post_slug)
          returning assignment.post_slug
        )
        select post_slug from swapped
      `,
    ]);

    return results[2].length === 2;
  } catch (error) {
    throw translateDatabaseError(error);
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type QueryDescriptor = {
  strings: TemplateStringsArray;
  values: unknown[];
};

type QueryRunner = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Row[] }>;
};

const database = vi.hoisted(() => {
  let runner: QueryRunner | null = null;

  function compile({ strings, values }: QueryDescriptor) {
    return {
      text: strings.reduce(
        (query, part, index) =>
          query + part + (index < values.length ? `$${index + 1}` : ""),
        "",
      ),
      values,
    };
  }

  const sql = Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (!runner) throw new Error("test database is not ready");
      const query = compile({ strings, values });
      return (await runner.query(query.text, query.values)).rows;
    },
    {
      transaction: async (
        callback: (
          transaction: (
            strings: TemplateStringsArray,
            ...values: unknown[]
          ) => QueryDescriptor,
        ) => QueryDescriptor[],
      ) => {
        if (!runner || !(runner instanceof Pool)) {
          throw new Error("test database pool is not ready");
        }
        const client: PoolClient = await runner.connect();
        try {
          await client.query("begin");
          const descriptors = callback((strings, ...values) => ({
            strings,
            values,
          }));
          const results = [];
          for (const descriptor of descriptors) {
            const query = compile(descriptor);
            results.push((await client.query(query.text, query.values)).rows);
          }
          await client.query("commit");
          return results;
        } catch (error) {
          await client.query("rollback");
          throw error;
        } finally {
          client.release();
        }
      },
    },
  );

  return {
    sql,
    setRunner(nextRunner: QueryRunner | null) {
      runner = nextRunner;
    },
  };
});

vi.mock("@/lib/db", () => ({ sql: database.sql }));

import {
  ArticleCategoryRepositoryError,
  insertArticleCategory,
  putArticleCategoryAssignment,
  readArticleCategoryConfiguration,
  removeArticleCategory,
  removeArticleCategoryAssignment,
  shiftArticleCategory,
  shiftArticleCategoryAssignment,
} from "./articleCategoryRepository";

const connectionString = process.env.TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;

integration("articleCategoryRepository with PostgreSQL", () => {
  const schema = `article_categories_${process.pid}_${Date.now()}`;
  let adminPool: Pool;
  let testPool: Pool;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString });
    await adminPool.query(`create schema "${schema}"`);
    testPool = new Pool({
      connectionString,
      options: `-c search_path=${schema}`,
      max: 6,
    });
    database.setRunner(testPool);
    const migration = await readFile(
      path.join(
        process.cwd(),
        "database/migrations/005-article-categories.sql",
      ),
      "utf8",
    );
    await testPool.query(migration);
  });

  beforeEach(async () => {
    await testPool.query(
      "truncate article_category_assignments, article_categories cascade",
    );
  });

  afterAll(async () => {
    database.setRunner(null);
    await testPool?.end();
    await adminPool?.query(`drop schema if exists "${schema}" cascade`);
    await adminPool?.end();
  });

  it("enforces normalized unique names and foreign keys", async () => {
    await insertArticleCategory("React");

    await expect(insertArticleCategory("react")).rejects.toMatchObject({
      code: "duplicate_name",
    });
    await expect(insertArticleCategory(" React ")).rejects.toMatchObject({
      code: "storage",
    });
    await expect(
      putArticleCategoryAssignment(
        "missing-category",
        "11111111-1111-4111-8111-111111111111",
      ),
    ).rejects.toMatchObject({ code: "missing_category" });
  });

  it("serializes repeated moves and normalizes sparse assignment positions", async () => {
    await insertArticleCategory("React");
    const react = (await readArticleCategoryConfiguration()).categories[0];
    await putArticleCategoryAssignment("alpha", react.id);
    await putArticleCategoryAssignment("beta", react.id);
    await putArticleCategoryAssignment("gamma", react.id);
    await testPool.query(`
      update article_category_assignments
      set position = case post_slug
        when 'alpha' then 10
        when 'beta' then 10
        else 42
      end
    `);

    const results = await Promise.all([
      shiftArticleCategoryAssignment("beta", "up"),
      shiftArticleCategoryAssignment("beta", "up"),
    ]);

    expect(results.sort()).toEqual([false, true]);
    expect(
      (await readArticleCategoryConfiguration()).assignments.map(
        ({ postSlug, position }) => [postSlug, position],
      ),
    ).toEqual([
      ["beta", 0],
      ["alpha", 1],
      ["gamma", 2],
    ]);
  });

  it("normalizes category moves, transfers assignments, and protects non-empty deletion", async () => {
    await insertArticleCategory("React");
    await insertArticleCategory("CSS");
    await insertArticleCategory("JavaScript");
    let state = await readArticleCategoryConfiguration();
    const react = state.categories.find((category) => category.name === "React")!;
    const css = state.categories.find((category) => category.name === "CSS")!;
    await testPool.query(
      "update article_categories set position = case when name = 'CSS' then 4 else 9 end",
    );

    expect(await shiftArticleCategory(react.id, "up")).toBe(true);
    state = await readArticleCategoryConfiguration();
    expect(state.categories.map(({ position }) => position)).toEqual([0, 1, 2]);

    await putArticleCategoryAssignment("alpha", react.id);
    await putArticleCategoryAssignment("beta", react.id);
    await putArticleCategoryAssignment("beta", css.id);
    state = await readArticleCategoryConfiguration();
    expect(
      state.assignments.map(({ postSlug, categoryId, position }) => [
        postSlug,
        categoryId,
        position,
      ]),
    ).toEqual([
      ["alpha", react.id, 0],
      ["beta", css.id, 0],
    ]);

    await expect(removeArticleCategory(react.id)).rejects.toBeInstanceOf(
      ArticleCategoryRepositoryError,
    );
    await removeArticleCategoryAssignment("alpha");
    await removeArticleCategory(react.id);
    expect(
      (await readArticleCategoryConfiguration()).categories.some(
        (category) => category.id === react.id,
      ),
    ).toBe(false);
  });
});

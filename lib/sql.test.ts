import { describe, expect, it, vi } from "vitest";
import {
  createSql,
  type SqlClient,
  type SqlPool,
  type SqlRow,
} from "./sql";

type QueryCall = {
  text: string;
  values: unknown[];
  target: "pool" | "client";
};

function createPool() {
  const calls: QueryCall[] = [];

  const client: SqlClient = {
    query: vi.fn(async (text: string, values: unknown[]) => {
      calls.push({ text, values, target: "client" });
      return { rows: [{ source: "client", text }] satisfies SqlRow[] };
    }),
    release: vi.fn(),
  };

  const pool: SqlPool = {
    query: vi.fn(async (text: string, values: unknown[]) => {
      calls.push({ text, values, target: "pool" });
      return { rows: [{ source: "pool", text }] satisfies SqlRow[] };
    }),
    connect: vi.fn(async () => client),
  };

  return { pool, client, calls };
}

describe("createSql", () => {
  it("把模板变量转换成 PostgreSQL 占位符并返回 rows", async () => {
    const { pool } = createPool();
    const sql = createSql(pool);

    const rows = await sql`select * from t where a = ${"x"} and b = ${2}`;

    expect(pool.query).toHaveBeenCalledWith(
      "select * from t where a = $1 and b = $2",
      ["x", 2],
    );
    expect(rows).toEqual([{ source: "pool", text: "select * from t where a = $1 and b = $2" }]);
  });

  it("事务按顺序执行并提交", async () => {
    const { pool, client, calls } = createPool();
    const sql = createSql(pool);

    const results = await sql.transaction((transaction) => [
      transaction`select 1`,
      transaction`select 2`,
    ]);

    expect(calls.map((call) => call.text)).toEqual([
      "BEGIN",
      "select 1",
      "select 2",
      "COMMIT",
    ]);
    expect(results).toHaveLength(2);
    expect(results[1]).toEqual([
      { source: "client", text: "select 2" },
    ]);
    expect(client.release).toHaveBeenCalled();
  });

  it("事务中的查询失败时回滚并释放连接", async () => {
    const { pool, client, calls } = createPool();
    const sql = createSql(pool);

    client.query = vi.fn(async (text: string, values: unknown[]) => {
      calls.push({ text, values, target: "client" });

      if (text === "select 1") {
        throw new Error("boom");
      }

      return { rows: [] };
    });

    await expect(
      sql.transaction((transaction) => [
        transaction`select 1`,
        transaction`select 2`,
      ]),
    ).rejects.toThrow("boom");

    expect(calls.map((call) => call.text)).toContain("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });

  it("事务回调抛错时也会回滚", async () => {
    const { pool, client, calls } = createPool();
    const sql = createSql(pool);

    await expect(
      sql.transaction(() => {
        throw new Error("callback failed");
      }),
    ).rejects.toThrow("callback failed");

    expect(calls.map((call) => call.text)).toContain("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });
});

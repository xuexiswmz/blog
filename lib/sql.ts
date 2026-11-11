export type SqlRow = Record<string, unknown>;

export type SqlQuery = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<SqlRow[]>;

export type Sql = SqlQuery & {
  transaction: (
    callback: (transaction: SqlQuery) => Array<Promise<SqlRow[]>>,
  ) => Promise<SqlRow[][]>;
};

export type SqlClient = {
  query: (text: string, values: unknown[]) => Promise<{ rows: SqlRow[] }>;
  release: () => void;
};

export type SqlPool = {
  query: (text: string, values: unknown[]) => Promise<{ rows: SqlRow[] }>;
  connect: () => Promise<SqlClient>;
};

export function buildParameterizedQuery(
  strings: TemplateStringsArray,
  valueCount: number,
) {
  let query = "";

  for (let index = 0; index < strings.length; index += 1) {
    query += strings[index];

    if (index < valueCount) {
      query += `$${index + 1}`;
    }
  }

  return query;
}

function createSqlQuery(
  executor: (text: string, values: unknown[]) => Promise<{ rows: SqlRow[] }>,
): SqlQuery {
  return async (strings, ...values) => {
    const text = buildParameterizedQuery(strings, values.length);
    const result = await executor(text, values);

    return result.rows;
  };
}

/**
 * 事务内的查询必须串行执行。
 * 如果直接并发调用 client.query，pg 会发出弃用警告，
 * 并在 pg 9 中不再支持。
 */
function createTransactionSql(client: SqlClient): SqlQuery {
  let chain: Promise<unknown> = Promise.resolve();
  let failed = false;

  return (strings, ...values) => {
    const text = buildParameterizedQuery(strings, values.length);

    const queryResult = chain.then(async () => {
      if (failed) {
        throw new Error("事务已失败，后续查询已取消");
      }

      try {
        return await client.query(text, values);
      } catch (error) {
        failed = true;
        throw error;
      }
    });

    chain = queryResult.then(
      () => undefined,
      () => undefined,
    );

    return queryResult.then((result) => result.rows);
  };
}

/**
 * 用 pg 连接池实现项目里已有的 sql 标签模板调用方式。
 *
 * 非事务查询直接走 pool.query；事务查询使用同一个 client，
 * 按回调返回的顺序依次执行，最后统一 COMMIT / ROLLBACK。
 */
export function createSql(pool: SqlPool): Sql {
  const sql = createSqlQuery((text, values) =>
    pool.query(text, values),
  ) as Sql;

  sql.transaction = async (callback) => {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN", []);
      transactionStarted = true;

      const transactionSql = createTransactionSql(client);
      const queries = callback(transactionSql);
      const results: SqlRow[][] = [];

      try {
        for (const query of queries) {
          results.push(await query);
        }
      } catch (error) {
        // 前面的查询失败时，回调里已经发出的后续查询也要收尾，
        // 避免产生未处理的 Promise rejection。
        await Promise.allSettled(queries);
        throw error;
      }

      await client.query("COMMIT", []);

      return results;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK", []);
        } catch {
          // 保留原始错误。
        }
      }

      throw error;
    } finally {
      client.release();
    }
  };

  return sql;
}

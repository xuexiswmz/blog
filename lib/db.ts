import { Pool } from "pg";
import { normalizePgSslMode } from "./postgresSsl";
import { createSql, type SqlPool } from "./sql";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("缺少 DATABASE_URL");
}

export const pool = new Pool({
  connectionString: normalizePgSslMode(databaseUrl),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  console.error("数据库连接池错误", error);
});

const sqlPool: SqlPool = {
  query: (text, values) => pool.query(text, values),
  connect: async () => {
    const client = await pool.connect();

    return {
      query: (text, values) => client.query(text, values),
      release: () => client.release(),
    };
  },
};

export const sql = createSql(sqlPool);

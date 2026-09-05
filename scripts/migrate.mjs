import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BOOTSTRAP_SCHEMAS = [
  "database/better-auth-schema.sql",
  "database/schema.sql",
];

export async function discoverMigrationNames(rootDirectory) {
  const migrationsDirectory = path.join(
    rootDirectory,
    "database",
    "migrations",
  );
  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => path.posix.join("database/migrations", name));

  const names = [...BOOTSTRAP_SCHEMAS, ...migrationNames];

  await Promise.all(
    names.map(async (name) => {
      try {
        await access(path.join(rootDirectory, name));
      } catch {
        throw new Error(`找不到迁移文件: ${name}`);
      }
    }),
  );

  return names;
}

function checksum(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function migrateDatabase({ client, rootDirectory, log }) {
  const migrationNames = await discoverMigrationNames(rootDirectory);
  const migrations = await Promise.all(
    migrationNames.map(async (name) => {
      const contents = await readFile(path.join(rootDirectory, name), "utf8");

      return {
        name,
        contents,
        checksum: checksum(contents),
      };
    }),
  );

  await client.query(
    "select pg_advisory_lock(hashtext('xuexiswmz-blog:migrate'))",
  );

  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedResult = await client.query(
      "select name, checksum from schema_migrations order by name",
    );
    const appliedChecksums = new Map(
      appliedResult.rows.map((row) => [String(row.name), String(row.checksum)]),
    );
    const migrationNameSet = new Set(migrationNames);

    for (const appliedName of appliedChecksums.keys()) {
      if (!migrationNameSet.has(appliedName)) {
        throw new Error(`数据库记录中的迁移文件不存在: ${appliedName}`);
      }
    }

    const result = { applied: [], skipped: [] };

    for (const migration of migrations) {
      const appliedChecksum = appliedChecksums.get(migration.name);

      if (appliedChecksum) {
        if (appliedChecksum !== migration.checksum) {
          throw new Error(`已执行的迁移文件被修改: ${migration.name}`);
        }

        result.skipped.push(migration.name);
        log(`跳过 ${migration.name}`);
        continue;
      }

      await client.query("begin");

      try {
        await client.query(migration.contents);
        await client.query(
          `
            insert into schema_migrations (name, checksum)
            values ($1, $2)
          `,
          [migration.name, migration.checksum],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }

      result.applied.push(migration.name);
      log(`已执行 ${migration.name}`);
    }

    return result;
  } finally {
    await client.query(
      "select pg_advisory_unlock(hashtext('xuexiswmz-blog:migrate'))",
    );
  }
}

function readOption(args, optionName) {
  const optionIndex = args.indexOf(optionName);

  if (optionIndex === -1) {
    return null;
  }

  return args[optionIndex + 1] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const rootDirectory = path.resolve(readOption(args, "--root") ?? ".");

  const migrationNames = await discoverMigrationNames(rootDirectory);

  if (args.includes("--plan")) {
    process.stdout.write(`${migrationNames.join("\n")}\n`);
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("缺少 DATABASE_URL");
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    const result = await migrateDatabase({
      client,
      rootDirectory,
      log: (message) => process.stdout.write(`${message}\n`),
    });

    process.stdout.write(
      `迁移完成：执行 ${result.applied.length} 个，跳过 ${result.skipped.length} 个。\n`,
    );
  } finally {
    await client.end();
  }
}

const entryFile = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entryFile === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

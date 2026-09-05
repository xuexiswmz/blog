import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
const migrateScript = path.resolve("scripts/migrate.mjs");

function createMigrationFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "blog-migrate-"));
  const migrationsDirectory = path.join(root, "database", "migrations");

  temporaryDirectories.push(root);
  mkdirSync(migrationsDirectory, { recursive: true });
  writeFileSync(path.join(root, "database", "better-auth-schema.sql"), "select 1;");
  writeFileSync(path.join(root, "database", "schema.sql"), "select 2;");
  writeFileSync(path.join(migrationsDirectory, "002-second.sql"), "select 4;");
  writeFileSync(path.join(migrationsDirectory, "001-first.sql"), "select 3;");

  return root;
}

describe("migrate CLI", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("plans bootstrap schemas before numbered migrations", () => {
    const root = createMigrationFixture();
    const result = spawnSync(
      process.execPath,
      [migrateScript, "--plan", "--root", root],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout.trim().split("\n")).toEqual([
      "database/better-auth-schema.sql",
      "database/schema.sql",
      "database/migrations/001-first.sql",
      "database/migrations/002-second.sql",
    ]);
  });

  it("fails when a required bootstrap schema is missing", () => {
    const root = createMigrationFixture();
    rmSync(path.join(root, "database", "better-auth-schema.sql"));

    const result = spawnSync(
      process.execPath,
      [migrateScript, "--plan", "--root", root],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("database/better-auth-schema.sql");
  });

  it("discovers the article visit migration", async () => {
    const migrateModule = await import("./migrate.mjs");
    const names = await migrateModule.discoverMigrationNames(process.cwd());

    expect(names).toContain("database/migrations/004-article-visits.sql");
  });
});

class FakeMigrationClient {
  readonly executedSql: string[] = [];
  readonly recordedNames: string[] = [];
  transactionCount = 0;

  constructor(
    private readonly appliedRows: { name: string; checksum: string }[] = [],
  ) {}

  async query(statement: string, values: unknown[] = []) {
    const sql = statement.trim();

    if (sql.startsWith("select name, checksum")) {
      return { rows: this.appliedRows };
    }

    if (sql === "begin") {
      this.transactionCount += 1;
    } else if (sql.startsWith("insert into schema_migrations")) {
      this.recordedNames.push(String(values[0]));
    } else if (sql.startsWith("select ") && sql.endsWith(";")) {
      this.executedSql.push(sql);
    }

    return { rows: [] };
  }
}

describe("migrateDatabase", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("applies and records every pending SQL file in order", async () => {
    const root = createMigrationFixture();
    const client = new FakeMigrationClient();
    const migrateModule = await import("./migrate.mjs");
    const result = await migrateModule.migrateDatabase?.({
      client,
      rootDirectory: root,
      log: () => undefined,
    });

    expect(result).toEqual({
      applied: [
        "database/better-auth-schema.sql",
        "database/schema.sql",
        "database/migrations/001-first.sql",
        "database/migrations/002-second.sql",
      ],
      skipped: [],
    });
    expect(client.executedSql).toEqual([
      "select 1;",
      "select 2;",
      "select 3;",
      "select 4;",
    ]);
    expect(client.recordedNames).toEqual(result?.applied);
    expect(client.transactionCount).toBe(4);
  });

  it("stops when the database records a migration missing from disk", async () => {
    const root = createMigrationFixture();
    const client = new FakeMigrationClient([
      {
        name: "database/migrations/000-missing.sql",
        checksum: "recorded-checksum",
      },
    ]);
    const migrateModule = await import("./migrate.mjs");

    await expect(
      migrateModule.migrateDatabase?.({
        client,
        rootDirectory: root,
        log: () => undefined,
      }),
    ).rejects.toThrow(
      "数据库记录中的迁移文件不存在: database/migrations/000-missing.sql",
    );
    expect(client.executedSql).toEqual([]);
  });
});

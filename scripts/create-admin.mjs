import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "管理员";

if (!email || !password) {
  console.error(
    "请先设置 ADMIN_EMAIL 和 ADMIN_PASSWORD 环境变量，例如：",
  );
  console.error(
    'ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD="至少8位密码" pnpm admin:create',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("ADMIN_PASSWORD 至少需要 8 个字符");
  process.exit(1);
}

if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  console.error(
    "缺少 DATABASE_URL / BETTER_AUTH_URL / BETTER_AUTH_SECRET，请检查 .env.local",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const seedAuth = betterAuth({
  appName: "xuexiswmz-blog",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});

try {
  const existingUser = await pool.query(
    'select id from "user" where lower(email) = lower($1) limit 1',
    [email],
  );

  if (existingUser.rows[0]) {
    const userId = existingUser.rows[0].id;
    const passwordHash = await hashPassword(password);
    const credentialAccount = await pool.query(
      'select id from account where "userId" = $1 and "providerId" = \'credential\' limit 1',
      [userId],
    );

    if (credentialAccount.rows[0]) {
      await pool.query(
        'update account set password = $1, "updatedAt" = now() where id = $2',
        [passwordHash, credentialAccount.rows[0].id],
      );
    } else {
      await pool.query(
        'insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") values ($1, $2, \'credential\', $3, $4, now(), now())',
        [randomUUID(), userId, userId, passwordHash],
      );
    }

    console.log(`已为现有用户设置邮箱密码登录: ${email}`);
  } else {
    const result = await seedAuth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    console.log(`管理员账号已创建: ${result.user.email}`);
  }
} catch (error) {
  if (error?.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    console.error(`账号已存在: ${email}。请换一个 ADMIN_EMAIL。`);
  } else {
    console.error(
      "创建管理员失败:",
      error instanceof Error ? error.message : error,
    );
  }

  process.exitCode = 1;
} finally {
  await pool.end();
}

import { betterAuth } from "better-auth";
import { pool } from "./db";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }

  return value;
}

export const auth = betterAuth({
  appName: "xuexiswmz-blog",
  baseURL: requiredEnv("BETTER_AUTH_URL"),
  secret: requiredEnv("BETTER_AUTH_SECRET"),

  database: pool,

  emailAndPassword: {
    enabled: true,
    // 管理后台不开放注册，管理员账号通过 pnpm admin:create 初始化。
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});

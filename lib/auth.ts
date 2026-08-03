import { APIError, betterAuth } from "better-auth"
import { Pool } from "pg"

function requiredEnv(name:string) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`缺少环境变量: ${name}`)
    }
    return value
}

const adminGithubId = requiredEnv("ADMIN_GITHUB_ID")

const pool = new Pool({ connectionString: requiredEnv("DATABASE_URL")})

export const auth = betterAuth({
    appName: "xuexiswmz-blog",
    baseURL: requiredEnv("BETTER_AUTH_URL"),
    secret: requiredEnv("BETTER_AUTH_SECRET"),

    database: pool,

    socialProviders:{
        github:{
            clientId: requiredEnv("AUTH_GITHUB_ID"),
            clientSecret: requiredEnv("AUTH_GITHUB_SECRET"),

            mapProfileToUser(profile) {
                if (String(profile.id) !== adminGithubId) {
                    throw new APIError("FORBIDDEN",{
                        code: "ADMIN_ONLY",
                        message: "该GITHUB账号没有管理员权限"
                    });
                    
                }
                return {
                    name: profile.name || profile.login,
                    image: profile.avatar_url
                }
            },
        }
    }
})
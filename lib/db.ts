import { neon } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    throw new Error(
        "缺少 DATABASE_URL"
    )
}

export const sql = neon(databaseUrl)
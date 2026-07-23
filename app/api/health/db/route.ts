import { sql } from "@/lib/db";

export async function GET() {
    try {
        const result = await sql`select now() as database_time`

        return Response.json({
            ok: true,
            databaseTime: result[0].database_time
        })
    } catch (error) {
        console.error("数据库连接失败: ",error);
        
        return Response.json(
            {
                ok: false,
                message: "数据库连接失败"
            },
            {
                status: 500
            }
        )
    }
}
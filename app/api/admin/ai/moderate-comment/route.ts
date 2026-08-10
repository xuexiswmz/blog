import { moderateComment } from "@/lib/ai/moderate-comment"
import { auth } from "@/lib/auth"

export const runtime = "nodejs"

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: request.headers,
    })

    if(!session){
        return Response.json(
            {
                message:'未登录或无权访问'
            },
            {
                status: 401
            }
        )
    }

    const body: unknown = await request.json().catch(()=> null)

    if(!isRecord(body)){
        return Response.json(
            {
                message: "请求参数格式不正确"
            },
            {
                status: 400
            }
        )
    }

    const username = typeof body.username === "string" ? body.username : ""
    const content = typeof body.content === "string" ? body.content.trim() : ""

    if(username.length <2 || username.length >20){
        return Response.json(
            {
                message: "用户名长度必须为 2-20 个字符"
            },
            {
                status: 400
            }
        )
    }

    if(content.length < 1 || content.length > 1000){
        return Response.json(
            {
                message: "评论内容长度必须为 1-1000 个字符"
            },
            {
                status: 400
            }
        )
    }

    const moderation  = await moderateComment({
        username,
        content
    })

    return Response.json({
        moderation
    })
}
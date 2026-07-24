import { cookies } from "next/headers"

const VISITOR_COOKIE_NAME = "blog_visitor_id"

const UUID_PRTTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidVisitorrID(value:string) {
    return UUID_PRTTERN.test(value)
}

// 读取cookies 
export async function readVisitorID() {
    const cookieStore = await cookies()

    const visitorID = cookieStore.get(
        VISITOR_COOKIE_NAME
    )?.value

    if (!visitorID || !isValidVisitorrID(visitorID)) {
        return null
    }

    return visitorID
}
// 创建游客ID
export async function getOrCreateVisitorId() {
    const cookieStore = await cookies()

    const currentVisitorId = cookieStore.get(
        VISITOR_COOKIE_NAME
    )?.value

    if (currentVisitorId && isValidVisitorrID(currentVisitorId)) {
        return currentVisitorId
    }

    const visitorId = crypto.randomUUID()

    cookieStore.set(
        VISITOR_COOKIE_NAME,
        visitorId,
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path:"/",
            maxAge: 60*60*24*365
        }
    )
    return visitorId
}
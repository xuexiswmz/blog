import { neon, neonConfig } from "@neondatabase/serverless"


// Tailscale IPv6 DNS或者路由劫持导致数据库连接失败，连接失败的时候使用下面的代码强制走IPv4连接数据库
// import https from "node:https"

// const ipv4Agent = new https.Agent({ family: 4 })

// neonConfig.fetchFunction = (url: string, init?: RequestInit) => {
//     const u = new URL(url)
//     return new Promise<Response>((resolve, reject) => {
//         const req = https.request({
//             hostname: u.hostname,
//             port: u.port || 443,
//             path: u.pathname + u.search,
//             method: init?.method || "GET",
//             headers: init?.headers as Record<string, string | string[] | undefined>,
//             agent: ipv4Agent,
//         }, (res) => {
//             const chunks: Buffer[] = []
//             res.on("data", (c: Buffer) => chunks.push(c))
//             res.on("end", () => {
//                 const headers = new Headers()
//                 for (const [k, v] of Object.entries(res.headers)) {
//                     if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v)
//                 }
//                 resolve(
//                     new Response(Buffer.concat(chunks), {
//                         status: res.statusCode,
//                         statusText: res.statusMessage,
//                         headers,
//                     })
//                 )
//             })
//         })
//         req.on("error", reject)
//         if (init?.body) req.write(init.body as string | Buffer)
//         req.end()
//     })
// }

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    throw new Error(
        "缺少 DATABASE_URL"
    )
}

export const sql = neon(databaseUrl)
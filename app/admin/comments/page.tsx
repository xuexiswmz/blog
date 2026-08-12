import CommentModerationList from "@/components/Admin/Comments/CommentModerationList"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"


export default async function AdminCommentsPage() {
    const session = await auth.api.getSession({
        headers:  await headers()
    })

    if (!session) {
        redirect("/admin/login")
    }
    return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-8">
            <Link href="/admin"
                className="text-blue-600 text-sm hover:underline"
            >
                返回管理中心
            </Link>
            <h1 className="mt-4 text-2xl font-semibold">
                评论审核
            </h1>
            <CommentModerationList />
        </div>
    </main>
  )
}

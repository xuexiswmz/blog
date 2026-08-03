import GithubLoginButton from "@/components/Admin/GithubLoginButton";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLoginPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (session) {
        redirect("/admin")
    }

    return (
        <main className="flex min-h-[70vh] items-center justify-center p-6">
            <section className="w-full max-w-sm rounded-xl border border-gray-200 p-6 text-center dark:border-gray-700">
                <h1 className="text-xl font-semibold">
                    管理员登录
                </h1>

                <p className=" mt-2 text-sm text-gray-500">
                    只有管理员可以进入后台
                </p>

                <div className=" mt-6">
                    <GithubLoginButton />
                </div>
            </section>
        </main>
    )
}
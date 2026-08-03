'use client'

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignOutButton() {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    
    async function handleSignOut() {
        setLoading(true)
        setError("")

        try {
            const result = await authClient.signOut()

            if (result.error) {
                setError(result.error.message ?? "退出登录失败")
                return
            }

            router.replace("/admin/login")
            router.refresh()
        } catch (error) {
            setError(error instanceof Error ? error.message : "退出登录失败")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className=" space-y-2">
            <button 
                className=" rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-900"
                type="button"
                disabled={loading}
                onClick={handleSignOut}
            >
                {loading ? "正在退出..." : "退出登录" }
            </button>

            {
                error && (
                    <p role="alert" className=" text-sm text-red-500">
                        {error}
                    </p>
                )
            }
        </div>
    )
}

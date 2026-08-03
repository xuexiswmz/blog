'use client'

import { authClient } from "@/lib/auth-client"
import Image from "next/image"
import { useState } from "react"

export default function GithubLoginButton() {

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSignIn() {
        setLoading(true)
        setError("")

        try {
            const result = await authClient.signIn.social({
                provider: "github",
                callbackURL: "/admin",
                errorCallbackURL: "/admin/login"
            })

            if (result.error) {
                setError(
                    result.error.message ?? "Github 登录失败"
                )
                setLoading(false)
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "Github 登录失败")
            setLoading(false)
        }
    }
  return (
    <div className="space-y-3">
        <button
            type="button"
            disabled={loading}
            onClick={handleSignIn}
            className=" inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
            <Image src="/github.svg" width={25} height={25} alt='Github Icon' className="size-4 invert dark:invert-0" />
            <span>
                {loading ? "正在跳转……" : "使用 GitHub 登录"}
            </span>
        </button>
        {
            error && (
                <p role="alert" className="text-sm text-red-500">
                    {error}
                </p>
            )
        }
    </div>
  )
}

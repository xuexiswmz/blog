'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type PendingComment = {
    id: string
    postSlug: string
    blockId: string
    rootId: string | null
    replyToId: string | null
    username: string
    content: string
    status: string
    createdAt: string
}

type CommmentsResponse = {
    comments: PendingComment[]
    count: number
    message?: string
}

type ReviewAction = "approve" | "reject"

export default function CommentModerationList() {
    const router = useRouter()

    const [comments, setComments] = useState<PendingComment[]>([])
    const [laoding, setLaoding] = useState(true)
    const [reviewingId, setReviewingId] = useState<string | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
      let cancelled = false
      async function loadComments() {
        try {
            const response = await fetch("/api/admin/comments", {
                cache: "no-store"
            })
            const data = await response.json().catch(()=>null) as CommmentsResponse | null

            if (response.status === 401) {
                router.replace("/api/login")
                return
            }

            if (!response.ok) {
                throw new Error(
                    data?.message ?? "读取待审核评论失败"
                )
            }

            if (!cancelled && data) {
                setComments(data.comments)
            }
        } catch (error) {
            if (!cancelled) {
                setError(
                    error instanceof Error ? error.message : "读取待审核评论失败"
                )
            }
        } finally {
            if (!cancelled) {
                setLaoding(false)
            }
        }
      }

      void loadComments()
    
      return () => {
        cancelled = true
      }
    }, [router])
    
    async function handleReview(
        commentId:string, 
        action: ReviewAction
    ){
        setReviewingId(commentId)
        setError("")
        
        try {
            const response = await fetch("/api/admin/comments", {
                method: "PATCH",
                headers:{
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    commentId,
                    action
                })
            })

            const data = await response
                .json()
                .catch(() => null) as { message?: string } | null

            if (response.status === 401) {
                router.replace("/admin/login")
                return
            }

            if (!response.ok) {
                throw new Error(
                data?.message ?? "审核评论失败"
                )
            }

            setComments((currentComments)=> currentComments.filter((comment)=> comment.id !== commentId))
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "审核评论失败"
            )
        } finally {
            setReviewingId(null)
        }
    }

    if (laoding) {
        return (
            <p className="text-sm text-gray-500 ">
                正在加载待审核评论...
            </p>
        )
    }

    return (
        <section className="space-y-4">
            <p className="text-sm text-gray-500">
                共 {comments.length} 条待审核评论
            </p>

            {
                error && (
                    <p role="alert" className="text-sm text-red-500">
                        {error}
                    </p>
                )
            }

            {
                comments.length === 0 ? (
                    <div className="text-sm rounded-xl border border-gray-200 p-6 dark:border-gray-800 text-gray-500">
                        目前没有待审核评论
                    </div>
                ) : (
                    comments.map((comment) => {
                        const reviewing = reviewingId === comment.id

                        return (
                            <article
                                className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
                                key={comment.id}
                            >
                                <div className="flex items-center flex-wrap gap-2">
                                    <strong>{comment.username}</strong>

                                    <time className="text-sm text-gray-500" dateTime={comment.createdAt}>
                                        {new Date(comment.createdAt).toLocaleString("zh-CN")}
                                    </time>

                                    <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                                        {comment.rootId ? "回复" : "根评论"}：
                                    </span>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap">
                                    {comment.content}
                                </p>

                                <div>
                                    <p>文章:{comment.postSlug}</p>
                                    <p>段落:{comment.blockId}</p>
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        disabled={reviewingId !== null}
                                        onClick={() =>
                                            handleReview(comment.id, "approve")
                                        }
                                        className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        通过
                                    </button>

                                    <button
                                        type="button"
                                        disabled={reviewingId !== null}
                                        onClick={() =>
                                            handleReview(comment.id, "reject")
                                        }
                                        className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        拒绝
                                    </button>

                                    <Link
                                        href={`/posts/${comment.postSlug}#${comment.blockId}`}
                                        target="_blank"
                                        className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
                                    >
                                        查看原文
                                    </Link>

                                    {reviewing && (
                                        <span className="self-center text-sm text-gray-500">
                                            正在审核评论...
                                        </span>
                                    )}
                                </div>
                            </article>
                        )
                    })
                )
            }
        </section>
    )
}
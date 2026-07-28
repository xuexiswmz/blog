'use client'

import { useEffect, useState } from "react"
import { CommentListResponse, ParagraphComment } from "./types"

type CommentListProps = {
    postSlug: string
    paragraphId: string
    onReply?: (comment: ParagraphComment) => void
}

function CommentList({
    postSlug,
    paragraphId,
    onReply
}:CommentListProps) {
    const [data, setData] = useState<CommentListResponse>({
        comments:[],
        count:0
    })

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
      const controller = new AbortController()
      async function loadComments() {
        try {
            setLoading(true)
            setError("")

            const searchParams = new URLSearchParams({
                blockId: paragraphId
            })

            const response = await fetch(`/api/posts/${encodeURIComponent(postSlug)}/comments?${searchParams}`,
                {
                    method: "GET",
                    cache: "no-cache",
                    signal: controller.signal
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message ?? "获取评论失败")
            }
            setData(result)
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return
            }

            setError(error instanceof Error ? error.message : "获取评论失败")
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false)
            }
        }
      }

      loadComments()
    
      return () => {
        controller.abort()
      }
    }, [postSlug, paragraphId])
    
    if (loading) {
        return (
            <p className="text-sm text-gray-500">
                正在加载评论...
            </p>
        )
    }

    if (error) {
        return (
            <p className="text-sm text-red-500">
                {error}
            </p>
        )
    }

    if (data.comments.length === 0) {
        return (
            <p className="text-sm text-gray-500">
                这个段落还没有评论
            </p>
        )
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-500">
                共 {data.count} 条评论
            </p>

            {
                data.comments.map((comment)=>(
                    <article
                        key={comment.id}
                        className="space-y-3"
                    >
                        <CommentContent
                            comment={comment}
                            onReply={onReply}
                        />

                        {comment.replies.length > 0 && (
                            <div className=" ml-5 space-y-3 border-l border-gray-200 pl-4 dark:border-gray-700">
                                {
                                    comment.replies.map((reply)=>(
                                        <CommentContent
                                            key={reply.id}
                                            comment={reply}
                                            onReply={onReply}
                                        />
                                    ))
                                }
                            </div>
                        )}
                    </article>
                ))
            }
        </div>
    )
}

type CommentContentProps = {
    comment: ParagraphComment
    onReply?: (comment: ParagraphComment) => void
}

function CommentContent({comment, onReply}: CommentContentProps) {
    return (
        <div className="text-sm">
            <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {comment.username}
                </span>

                <time className="text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleString("zh-CN")}
                </time>
            </div>

            {
                comment.replyToUsername && (
                    <p className=" mt-1 text-xs text-gray-500">
                        回复 @{comment.replyToUsername}
                    </p>
                )
            }

            <p className=" mt-1 whitespace-pre-wrap wrap-break-word text-gray-700 dark:text-gray-100">
                { comment.content}
            </p>

            {
                !comment.deleted && onReply && (
                    <button type="button"
                        onClick={()=> onReply(comment)}
                        className=" mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                        回复
                    </button>
                )
            }
        </div>
    )
}

export default CommentList
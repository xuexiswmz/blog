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
    authorType: "guest" | "admin" | "ai"
    moderationSource: "ai" | "human" | null
    moderationReason: string | null
    moderationModel: string | null
    moderatedAt: string | null
}

type CommmentsResponse = {
    comments: PendingComment[]
    count: number
    message?: string
}

type ReviewAction = "approve" | "reject"

type CommentContentProps = {
    content: string
    expanded: boolean
    onToggle: () => void
}

const COMMENT_PREVIEW_LENGTH = 120

function CommentContent({
    content,
    expanded,
    onToggle,
}: CommentContentProps) {
    const characters = Array.from(content)
    const collapsible = characters.length > COMMENT_PREVIEW_LENGTH
    const visibleContent =
        collapsible && !expanded
            ? `${characters.slice(0, COMMENT_PREVIEW_LENGTH).join("")}…`
            : content

    return (
        <div>
            <p className="whitespace-pre-wrap break-words leading-6">
                {visibleContent}
            </p>

            {collapsible && (
                <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={onToggle}
                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                    {expanded ? "收起" : "展开"}
                </button>
            )}
        </div>
    )
}

export default function CommentModerationList() {
    const router = useRouter()

    const [comments, setComments] = useState<PendingComment[]>([])
    const [loading, setLoading] = useState(true)
    const [reviewingId, setReviewingId] = useState<string | null>(null)
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
    const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(
        () => new Set(),
    )
    const [error, setError] = useState("")

    const selectedComment =
        comments.find((comment) => comment.id === selectedCommentId) ?? null

    useEffect(() => {
        let cancelled = false

        async function loadComments() {
            try {
                const response = await fetch("/api/admin/comments", {
                    cache: "no-store",
                })
                const data = (await response
                    .json()
                    .catch(() => null)) as CommmentsResponse | null

                if (response.status === 401) {
                    router.replace("/admin/login")
                    return
                }

                if (!response.ok) {
                    throw new Error(
                        data?.message ?? "读取待审核评论失败",
                    )
                }

                if (!cancelled && data) {
                    setComments(data.comments)
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "读取待审核评论失败",
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadComments()

        return () => {
            cancelled = true
        }
    }, [router])

    useEffect(() => {
        if (!selectedCommentId) {
            return
        }

        const previousOverflow = document.body.style.overflow

        function closeWithEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setSelectedCommentId(null)
            }
        }

        document.body.style.overflow = "hidden"
        window.addEventListener("keydown", closeWithEscape)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener("keydown", closeWithEscape)
        }
    }, [selectedCommentId])

    function toggleComment(commentId: string) {
        setExpandedCommentIds((currentIds) => {
            const nextIds = new Set(currentIds)

            if (nextIds.has(commentId)) {
                nextIds.delete(commentId)
            } else {
                nextIds.add(commentId)
            }

            return nextIds
        })
    }

    async function handleReview(
        commentId: string,
        action: ReviewAction,
    ) {
        setReviewingId(commentId)
        setError("")

        try {
            const response = await fetch("/api/admin/comments", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    commentId,
                    action,
                }),
            })

            const data = (await response
                .json()
                .catch(() => null)) as { message?: string } | null

            if (response.status === 401) {
                router.replace("/admin/login")
                return
            }

            if (!response.ok) {
                throw new Error(data?.message ?? "审核评论失败")
            }

            setComments((currentComments) =>
                currentComments.filter((comment) => comment.id !== commentId),
            )
            setSelectedCommentId((currentId) =>
                currentId === commentId ? null : currentId,
            )
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "审核评论失败",
            )
        } finally {
            setReviewingId(null)
        }
    }

    if (loading) {
        return (
            <p className="text-sm text-gray-500">
                正在加载待审核评论...
            </p>
        )
    }

    return (
        <section className="space-y-4">
            <p className="text-sm text-gray-500">
                共 {comments.length} 条待审核评论
            </p>

            {error && (
                <p role="alert" className="text-sm text-red-500">
                    {error}
                </p>
            )}

            {comments.length === 0 ? (
                <div className="border-y border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
                    目前没有待审核评论
                </div>
            ) : (
                <>
                    <div className="hidden overflow-x-auto border-y border-gray-200 dark:border-gray-800 md:block">
                        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                            <caption className="sr-only">
                                待审核评论列表
                            </caption>

                            <thead className="bg-gray-50 text-xs font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="w-32 px-4 py-3">
                                        用户名
                                    </th>
                                    <th scope="col" className="w-44 px-4 py-3">
                                        时间
                                    </th>
                                    <th scope="col" className="min-w-96 px-4 py-3">
                                        评论
                                    </th>
                                    <th scope="col" className="w-36 px-4 py-3">
                                        AI 状态
                                    </th>
                                    <th scope="col" className="w-44 px-4 py-3">
                                        模型
                                    </th>
                                    <th scope="col" className="w-52 px-4 py-3">
                                        段落
                                    </th>
                                    <th scope="col" className="sticky right-0 w-56 bg-gray-50 px-4 py-3 text-right dark:bg-gray-900">
                                        操作
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {comments.map((comment) => {
                                    const reviewing = reviewingId === comment.id
                                    const expanded = expandedCommentIds.has(comment.id)

                                    return (
                                        <tr
                                            key={comment.id}
                                            className="group align-top transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
                                        >
                                            <td className="px-4 py-4 font-medium">
                                                <span className="block max-w-28 break-words">
                                                    {comment.username}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                                                <time dateTime={comment.createdAt}>
                                                    {new Date(comment.createdAt).toLocaleString("zh-CN")}
                                                </time>
                                            </td>

                                            <td className="px-4 py-4">
                                                <CommentContent
                                                    content={comment.content}
                                                    expanded={expanded}
                                                    onToggle={() => toggleComment(comment.id)}
                                                />
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={
                                                        comment.moderationSource === "ai"
                                                            ? "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                                            : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                                    }
                                                >
                                                    {comment.moderationSource === "ai"
                                                        ? "人工复核"
                                                        : "未经过 AI"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-gray-500">
                                                <span className="block break-all">
                                                    {comment.moderationModel ?? "—"}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <Link
                                                    href={`/posts/${comment.postSlug}#${comment.blockId}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block break-all text-blue-600 hover:underline dark:text-blue-400"
                                                >
                                                    {comment.blockId}
                                                </Link>
                                            </td>

                                            <td className="sticky right-0 bg-white px-4 py-4 transition-colors group-hover:bg-gray-50 dark:bg-black dark:group-hover:bg-gray-900">
                                                <div className="flex flex-wrap justify-end gap-x-4 gap-y-2 text-sm">
                                                    <button
                                                        type="button"
                                                        disabled={reviewingId !== null}
                                                        onClick={() =>
                                                            handleReview(comment.id, "approve")
                                                        }
                                                        className="text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                                                    >
                                                        通过
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={reviewingId !== null}
                                                        onClick={() =>
                                                            handleReview(comment.id, "reject")
                                                        }
                                                        className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                                                    >
                                                        拒绝
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCommentId(comment.id)}
                                                        className="text-blue-600 hover:underline dark:text-blue-400"
                                                    >
                                                        查看详情
                                                    </button>
                                                </div>

                                                {reviewing && (
                                                    <p className="mt-2 text-right text-xs text-gray-500">
                                                        审核中...
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <ul className="space-y-3 md:hidden">
                        {comments.map((comment) => {
                            const reviewing = reviewingId === comment.id
                            const expanded = expandedCommentIds.has(comment.id)

                            return (
                                <li
                                    key={comment.id}
                                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                                >
                                    <strong className="block break-words text-sm">
                                        {comment.username}
                                    </strong>

                                    <div className="mt-3 text-sm">
                                        <CommentContent
                                            content={comment.content}
                                            expanded={expanded}
                                            onToggle={() => toggleComment(comment.id)}
                                        />
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
                                        <button
                                            type="button"
                                            disabled={reviewingId !== null}
                                            onClick={() => handleReview(comment.id, "approve")}
                                            className="text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                                        >
                                            通过
                                        </button>

                                        <button
                                            type="button"
                                            disabled={reviewingId !== null}
                                            onClick={() => handleReview(comment.id, "reject")}
                                            className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                                        >
                                            拒绝
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedCommentId(comment.id)}
                                            className="text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            查看详情
                                        </button>

                                        {reviewing && (
                                            <span className="text-xs text-gray-500">
                                                审核中...
                                            </span>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </>
            )}

            {selectedComment && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="comment-detail-title"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
                >
                    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-950 sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="comment-detail-title"
                                    className="text-2xl font-semibold tracking-tight"
                                >
                                    评论详情
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    查看评论内容和审核上下文
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedCommentId(null)}
                                className="shrink-0 text-sm text-gray-500 hover:text-gray-950 hover:underline dark:hover:text-white"
                            >
                                关闭
                            </button>
                        </div>

                        <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    用户名
                                </dt>
                                <dd className="mt-1 break-words font-medium">
                                    {selectedComment.username}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    时间
                                </dt>
                                <dd className="mt-1 text-gray-700 dark:text-gray-200">
                                    {new Date(selectedComment.createdAt).toLocaleString("zh-CN")}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    类型
                                </dt>
                                <dd className="mt-2">
                                    <span className="inline-flex min-w-20 justify-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                        {selectedComment.rootId ? "回复" : "根评论"}
                                    </span>
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    AI 状态
                                </dt>
                                <dd className="mt-2">
                                    <span
                                        className={
                                            selectedComment.moderationSource === "ai"
                                                ? "inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                                : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                        }
                                    >
                                        {selectedComment.moderationSource === "ai"
                                            ? "需要人工复核"
                                            : "未经过 AI 审核"}
                                    </span>
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    文章
                                </dt>
                                <dd className="mt-1">
                                    <Link
                                        href={`/posts/${selectedComment.postSlug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="break-all text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        {selectedComment.postSlug}
                                    </Link>
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    段落
                                </dt>
                                <dd className="mt-1">
                                    <Link
                                        href={`/posts/${selectedComment.postSlug}#${selectedComment.blockId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="break-all text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        {selectedComment.blockId}
                                    </Link>
                                </dd>
                            </div>

                            <div className="sm:col-span-2">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                    模型
                                </dt>
                                <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">
                                    {selectedComment.moderationModel ?? "未记录"}
                                </dd>
                            </div>
                        </dl>

                        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
                            <h3 className="text-sm font-semibold">
                                评论内容
                            </h3>
                            <p className="mt-3 whitespace-pre-wrap break-words border-l-2 border-gray-300 pl-4 text-base leading-7 text-gray-800 dark:border-gray-700 dark:text-gray-100">
                                {selectedComment.content}
                            </p>
                        </section>

                        <section className="mt-8 rounded-2xl bg-gray-50 p-5 dark:bg-gray-900/70">
                            <h3 className="text-sm font-semibold">
                                AI 审核说明
                            </h3>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 dark:text-gray-300">
                                {selectedComment.moderationReason ?? "没有提供审核原因"}
                            </p>
                        </section>

                        <div className="mt-6 flex flex-wrap justify-end gap-x-5 gap-y-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
                            <button
                                type="button"
                                disabled={reviewingId !== null}
                                onClick={() =>
                                    handleReview(selectedComment.id, "approve")
                                }
                                className="text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                            >
                                通过
                            </button>

                            <button
                                type="button"
                                disabled={reviewingId !== null}
                                onClick={() =>
                                    handleReview(selectedComment.id, "reject")
                                }
                                className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                            >
                                拒绝
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedCommentId(null)}
                                className="text-gray-600 hover:underline dark:text-gray-300"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

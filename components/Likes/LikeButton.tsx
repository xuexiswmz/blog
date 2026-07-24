"use client";

import { ThumbsUp } from 'lucide-react'
import { useState } from 'react'

type LikeButtonProps = {
    slug: string
    initialCount: number
    initialLiked: boolean
}

export default function LikeButton({
    slug,
    initialCount,
    initialLiked
}: LikeButtonProps) {

    const [count, setCount] = useState(initialCount)
    const [liked, setLiked] = useState(initialLiked)
    const [pending, setPending] = useState(false)

    async function handleLike() {
        if (pending) {
            return
        }
        const previousLiked = liked;
        const previousCount = count;

        const nextLiked = !previousLiked;
        const nextCount = Math.max(
          0,
          previousCount + (nextLiked ? 1 : -1),
        );

        // 立即更新页面
        setLiked(nextLiked);
        setCount(nextCount);
        setPending(true)

        try {
            const response = await fetch(
                `/api/posts/${slug}/likes`,
                {
                    method: "POST"
                }
            )

            const data = await response.json()
            
            if (!response.ok) {
                throw new Error("点赞请求失败")
            }

            // 用数据库返回的真实状态校准
            setLiked(Boolean(data.liked));
            setCount(Number(data.count));
        } catch (error) {
            console.error(error);
            // 请求失败，恢复点击前的状态
            setLiked(previousLiked);
            setCount(previousCount);
        } finally {
            setPending(false)
        }
    }
  return (
    <button
      type="button"
      aria-label={
        liked ? "取消点赞" : "点赞"
      }
      aria-pressed={liked}
      disabled={pending}
      onClick={handleLike}
      className="
        mt-3 inline-flex items-center gap-1.5
        text-xs text-gray-500
        transition-colors
        hover:text-red-500
        disabled:cursor-wait
        disabled:opacity-60
        dark:text-gray-400
        dark:hover:text-red-400
      "
    >
      <ThumbsUp
        aria-hidden="true"
        className={
          liked
            ? "size-4 text-red-400"
            : "size-4"
        }
      />

      <span>{count}</span>
    </button>
  )
}

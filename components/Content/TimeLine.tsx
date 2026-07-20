import Image from 'next/image';
import Link from 'next/link';
import React, { Fragment } from 'react'

const archives = [
  {
    year: "2026",
    posts: [
      {
        date: "01-06",
        title: "前端性能革命：200 行 JavaScript 代码实现 Streaming JSON",
        href: "/posts/streaming-json",
        image: "/avatar.jpeg",
        imageAlt: "Streaming JSON 文章封面",
        description:"前端性能革命"
      },
      {
        date: "01-02",
        title: "我的博客项目正式启动",
        href: "/posts/blog-start",
        image: "/avatar.jpeg",
        imageAlt: "Streaming JSON 文章封面",
        description:"我的博客项目"
      },
    ],
  },
];

const TimeLine = () => {
  return (
    <main className='flex flex-1 min-w-0 p-5'>
        <div className="w-full">
      {archives.map((group) => (
        <section
          key={group.year}
          className="
            grid
            grid-cols-[56px_28px_minmax(0,1fr)]
            md:grid-cols-[90px_40px_minmax(0,1fr)]
          "
        >
          {/* 年份 */}
          <h2 className="py-4 w-full text-right pr-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            {group.year}
          </h2>

          {/* 年份节点 */}
          <div className="relative flex justify-center py-4">
            <span className="absolute bottom-0 top-1/2 w-px bg-gray-200 dark:bg-gray-700" />

            <span className="relative mt-1 size-3 rounded-full border-2 border-blue-600 bg-white dark:bg-gray-950" />
          </div>

          {/* 文章数量 */}
          <p className="py-4 text-sm text-gray-600 dark:text-gray-400">
            {group.posts.length} 篇文章
          </p>

          {group.posts.map((post) => (
            <Fragment key={post.href}>
              {/* 日期 */}
              <time className=" w-full py-5 text-right pr-2 text-xs text-gray-500 dark:text-gray-500">
                {post.date}
              </time>

              {/* 普通节点 */}
              <div className="relative flex justify-center py-5">
                <span className="absolute inset-y-0 w-px bg-gray-200 dark:bg-gray-700" />

                <span
                  className="
                    relative mt-1.5 size-1
                    rounded-full bg-blue-600
                    ring-4 ring-white
                    dark:ring-gray-950
                  "
                />
              </div>

              {/* 文章标题 */}
              <Link
                href={post.href}
                className="
                  group flex justify-center
                  items-center gap-4 py-5
                "
              >
                <div className='min-w-0 flex-1'>
                    <h3 className='
                        text-sm font-medium
                        text-gray-800
                        transition-colors
                        group-hover:text-blue-600
                        dark:text-gray-200
                        dark:group-hover:text-blue-400
                        '>
                        {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {post.description}
                    </p>
                </div>
                <Image
                    src={post.image}
                    alt={post.imageAlt}
                    width={96}
                    height={64}
                    className=' hidden h-16 w-24 shrink-0 rounded-md object-cover transition-transform group-hover:scale-105 sm:block '
                />
              </Link>
            </Fragment>
          ))}
        </section>
      ))}
    </div>
    </main>
  )
}

export default TimeLine
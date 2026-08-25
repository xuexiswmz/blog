import { getLikeSummaries } from '@/lib/likes';
import { getPostArchives } from '@/lib/posts';
import { readVisitorID } from '@/lib/visitor';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react'
import LikeButton from '../Likes/LikeButton';
import TimelineEntrance from './TimelineEntrance';

const TimeLine = async () => {

  const [archives, visitorId] = await Promise.all([
    getPostArchives(),
    readVisitorID()
  ])
  const likeSummaries = await getLikeSummaries(visitorId)
  return (
    <main className='flex flex-1 min-w-0 p-5 h-full min-h-0 overflow-y-auto overscroll-contain scrollbar-hide'>
        <TimelineEntrance>
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
              <h2 className="flex w-full items-center justify-end py-4 pr-2 text-xl font-bold leading-none text-slate-900 dark:text-slate-300/90">
                {group.year}
              </h2>

              {/* 年份节点 */}
              <div className="relative flex items-center justify-center py-4">
                <span className="absolute bottom-0 top-1/2 w-px bg-slate-200 dark:bg-slate-700/70" />

                <span className="relative size-3 rounded-full border-2 border-blue-400 bg-background" />
              </div>

              {/* 文章数量 */}
              <p className="flex items-center py-4 text-sm text-slate-600 dark:text-slate-400">
                {group.posts.length} 篇文章
              </p>

              {group.posts.map((post) => {
                const likeSummary = likeSummaries.get(post.slug) ?? {
                  count: 0,
                  liked: false
                }
                return (
                  <Fragment key={`/posts/${post.slug}`}>
                    {/* 日期 */}
                    <time className="w-full py-5 pr-2 text-right text-xs text-slate-500 dark:text-slate-500">
                      {post.date.slice(5)}
                    </time>

                    {/* 普通节点 */}
                    <div className="relative flex justify-center py-5">
                      <span className="absolute inset-y-0 w-px bg-slate-200 dark:bg-slate-700/70" />

                      <span
                        className="
                          relative mt-1.5 size-1
                          rounded-full bg-blue-400
                          ring-4 ring-background
                        "
                      />
                    </div>

                    {/* 文章标题 */}
                    <div className=' timeline-entry py-5'>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="
                          group flex justify-center
                          items-center gap-4 py-5
                        "
                      >
                        <div className='min-w-0 flex-1'>
                            <h3 className='
                                text-sm font-medium
                                text-slate-800
                                transition-colors
                                group-hover:text-blue-500
                                dark:text-slate-300/90
                                dark:group-hover:text-blue-300
                                '>
                                {post.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {post.description}
                            </p>
                        </div>
                        {
                          post.image && (
                            <Image
                              src={post.image}
                              alt={post.imageAlt ?? `${post.title}文章封面`}
                              width={96}
                              height={64}
                              className=' hidden h-16 w-24 shrink-0 rounded-md object-cover transition-transform group-hover:scale-105 sm:block '
                            />
                          )
                        }
                        
                      </Link>
                      <LikeButton
                        slug={post.slug}
                        initialCount={likeSummary.count}
                        initialLiked={likeSummary.liked}
                      />
                    </div>
                  </Fragment>
                )
          })}
            </section>
          ))}
        </TimelineEntrance>
    </main>
  )
}

export default TimeLine

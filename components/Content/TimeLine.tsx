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
    <main className='scrollbar-hide h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-md bg-white/70 px-[clamp(0.75rem,1.5vw,1.5rem)] py-[clamp(0.5rem,1vh,0.75rem)] backdrop-blur-xl dark:bg-background'>
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
              <h2 className="flex w-full items-center justify-end py-3 pr-2 text-lg font-bold leading-none text-slate-950 dark:text-slate-200">
                {group.year}
              </h2>

              {/* 年份节点 */}
              <div className="relative flex items-center justify-center py-3">
                <span className="absolute bottom-0 top-1/2 w-px bg-slate-200 dark:bg-slate-700/70" />

                <span className="relative size-3 rounded-full border-2 border-blue-400 bg-background" />
              </div>

              {/* 文章数量 */}
              <p className="flex items-center py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
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
                    <time className="flex w-full items-center justify-end py-3 pr-2 text-right text-xs text-slate-500 dark:text-slate-400">
                      {post.date.slice(5)}
                    </time>

                    {/* 普通节点 */}
                    <div className="relative flex items-center justify-center py-3">
                      <span className="absolute inset-y-0 w-px bg-slate-200 dark:bg-slate-700/70" />

                      <span
                        className="
                          relative size-1
                          rounded-full bg-blue-400
                          ring-4 ring-background
                        "
                      />
                    </div>

                    {/* 文章标题 */}
                    <div className='timeline-entry flex min-w-0 items-center gap-3 py-3'>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="
                          group flex min-w-0 flex-1
                          items-center gap-3
                        "
                      >
                        <div className='min-w-0 flex-1'>
                            <h3 className='
                                truncate text-sm font-semibold
                                text-slate-900
                                transition-colors
                                group-hover:text-blue-500
                                dark:text-slate-200
                                dark:group-hover:text-blue-300
                                '>
                                {post.title}
                            </h3>
                            <p className="mt-1 line-clamp-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
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
                              className='hidden h-12 w-18 shrink-0 rounded-md object-cover transition-transform group-hover:scale-105 sm:block'
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

'use client'
import { ComponentPropsWithoutRef, useState } from 'react'
import { useArticleComments } from './ArticleCommentsProvider'
import { MessageCircle } from 'lucide-react'

type CommentableParagraphProps = ComponentPropsWithoutRef<'p'> &{
    paragraphId: string
}

function CommentableParagraph({
    paragraphId,
    children,
    className,
    ...paragraphProps
}: CommentableParagraphProps) {
    const { postSlug } = useArticleComments()
    const [open, setOpen] = useState(false)

    const panelId = `comments-${paragraphId}`

    return (
        <div className='my-[1.25em] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2'>
            <p 
                {...paragraphProps}
                data-paragraph-id={paragraphId}
                className={`m-0! ${className ?? ""}`}
            >
                {children}
            </p>
            <button type='button' aria-label='查看段评'
                aria-expanded={open}
                aria-controls={panelId}
                onClick={()=>{
                    setOpen((current)=> !current)
                }}
                className='
                    not-prose
                    mt-1
                    inline-flex size-8
                    items-center justify-center
                    rounded-full text-gray-400
                    transition-colors
                    hover:bg-gray-100 hover:text-blue-600
                    dark:text-gray-500 dark:hover:bg-gray-500
                    dark:hover:text-blue-400
                '
            >
                <MessageCircle aria-hidden="true" className='size-4' />
            </button>

            {open && (
                <div id={panelId}
                    className="
                        not-prose
                        col-span-2
                        mt-3 rounded-lg border
                        border-gray-200
                        bg-gray-50
                        p-4 text-sm
                        text-gray-600
                        dark:border-gray-700
                        dark:bg-gray-900
                        dark:text-gray-300
                    "
                >
                    <p>评论面板连接成功</p>

                    <dl className="mt-3 space-y-1 text-xs">
                        <div className="flex gap-2">
                        <dt className="font-medium">
                            文章：
                        </dt>

                        <dd className="break-all">
                            {postSlug}
                        </dd>
                        </div>

                        <div className="flex gap-2">
                        <dt className="font-medium">
                            段落：
                        </dt>

                        <dd className="break-all">
                            {paragraphId}
                        </dd>
                        </div>
                    </dl>
                </div>
                )}
        </div>
    )
}

export default CommentableParagraph
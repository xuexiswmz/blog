'use client'
import { createContext, ReactNode, useContext } from "react"

type AricleCommentsContextValue = {
    postSlug: string
}

const AricleCommentsContext = createContext<AricleCommentsContextValue | null>(null)

type ArticleCommentsProviderProps = {
    postSlug: string
    children: ReactNode
}

// 把文章slug提供给所有段评组件

function ArticleCommentsProvider({
    postSlug,
    children
}: ArticleCommentsProviderProps) {
  return (
    <AricleCommentsContext.Provider
        value={{ postSlug }}
    >
        {children}
    </AricleCommentsContext.Provider>
  )
}

export function useArticleComments(){
    const context = useContext( AricleCommentsContext )
    if (!context) {
        throw new Error(
            "useArticleComments 必须在 ArticleCommentsProvider 内使用"
        )
    }
    return context
}

export default ArticleCommentsProvider
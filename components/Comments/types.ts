export type ParagraphComment = {
    id: string
    username: string
    content: string
    createdAt: string

    rootId: string | null
    replyToId: string | null

    replyToUsername: string | null
    replyToContent: string | null
    
    deleted: boolean
    replies: ParagraphComment[]
}

export type CommentListResponse = {
    comments: ParagraphComment[]
    count: number
}
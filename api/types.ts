export interface ArticleRow {
  id: number
  title: string
  content: string
  summary: string | null
  coverImage: string | null
  categoryId: number
  viewCount: number
  createdAt: string
  updatedAt: string
  categoryName?: string
}

export interface CategoryRow {
  id: number
  name: string
  createdAt: string
  articleCount?: number
}

export interface TagRow {
  id: number
  name: string
  createdAt: string
  articleCount?: number
}

export interface CommentRow {
  id: number
  articleId: number
  parentId: number | null
  author: string
  email: string
  content: string
  isApproved: number
  createdAt: string
  articleTitle?: string
}

export interface UserRow {
  id: number
  username: string
  password: string
  createdAt: string
}

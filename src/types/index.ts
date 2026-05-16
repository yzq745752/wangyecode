export interface Article {
  id: number
  title: string
  content: string
  summary: string
  coverImage: string | null
  categoryId: number
  category: Category
  tags: Tag[]
  createdAt: string
  updatedAt: string
  viewCount: number
}

export interface Category {
  id: number
  name: string
  articleCount?: number
  createdAt?: string
}

export interface Tag {
  id: number
  name: string
  articleCount?: number
  createdAt?: string
}

export interface User {
  id: number
  username: string
}

export interface ArticleListResponse {
  data: Article[]
  total: number
  page: number
  limit: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface Comment {
  id: number
  articleId: number
  parentId: number | null
  author: string
  email: string
  content: string
  isApproved: number
  createdAt: string
  replies?: Comment[]
}

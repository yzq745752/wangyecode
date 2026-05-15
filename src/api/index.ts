import apiClient from './client'
import type {
  Article,
  Category,
  Tag,
  Comment,
  ArticleListResponse,
  LoginRequest,
  LoginResponse,
} from '@/types'

export const articleApi = {
  getList: (page = 1, limit = 9, params?: { category?: string; tag?: string; search?: string }) =>
    apiClient.get<ArticleListResponse>('/articles', { params: { page, limit, ...params } }),

  getById: (id: number) =>
    apiClient.get<{ data: Article }>(`/articles/${id}`),

  getRelated: (id: number) =>
    apiClient.get<{ data: Article[] }>(`/articles/${id}/related`),

  create: (data: Partial<Article>) =>
    apiClient.post<{ data: Article }>('/articles', data),

  update: (id: number, data: Partial<Article>) =>
    apiClient.put<{ data: Article }>(`/articles/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/articles/${id}`),
}

export const categoryApi = {
  getAll: () =>
    apiClient.get<{ data: Category[] }>('/categories'),

  create: (data: { name: string }) =>
    apiClient.post<{ data: Category }>('/categories', data),

  update: (id: number, data: { name: string }) =>
    apiClient.put<{ data: Category }>(`/categories/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/categories/${id}`),
}

export const tagApi = {
  getAll: () =>
    apiClient.get<{ data: Tag[] }>('/tags'),

  create: (data: { name: string }) =>
    apiClient.post<{ data: Tag }>('/tags', data),

  update: (id: number, data: { name: string }) =>
    apiClient.put<{ data: Tag }>(`/tags/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/tags/${id}`),
}

export const commentApi = {
  getByArticle: (articleId: number) =>
    apiClient.get<{ data: Comment[] }>(`/articles/${articleId}/comments`),

  create: (articleId: number, data: { author: string; email?: string; content: string; parentId?: number | null }) =>
    apiClient.post<{ data: Comment; message: string }>(`/articles/${articleId}/comments`, data),
}

export const adminCommentApi = {
  getAll: (page = 1, limit = 20) =>
    apiClient.get<{ data: Comment[]; total: number }>('/admin/comments', { params: { page, limit } }),

  approve: (id: number, isApproved: number) =>
    apiClient.put(`/admin/comments/${id}/approve`, { isApproved }),

  delete: (id: number) =>
    apiClient.delete(`/admin/comments/${id}`),
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  verify: () =>
    apiClient.get<{ user: { id: number; username: string } }>('/auth/verify'),
}

export interface ImageItem {
  filename: string
  url: string
  size: number
  createdAt: string
}

export const imageApi = {
  getAll: () =>
    apiClient.get<{ data: ImageItem[] }>('/admin/images'),

  delete: (filename: string) =>
    apiClient.delete(`/admin/images/${filename}`),

  upload: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return apiClient.post<{ url: string; filename: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

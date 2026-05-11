import apiClient from './client'
import type {
  Article,
  Category,
  Tag,
  ArticleListResponse,
  LoginRequest,
  LoginResponse,
} from '@/types'

export const articleApi = {
  getList: (page = 1, limit = 9, params?: { category?: string; tag?: string; search?: string }) =>
    apiClient.get<ArticleListResponse>('/articles', { params: { page, limit, ...params } }),

  getById: (id: number) =>
    apiClient.get<{ data: Article }>(`/articles/${id}`),

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

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  verify: () =>
    apiClient.get<{ user: { id: number; username: string } }>('/auth/verify'),
}

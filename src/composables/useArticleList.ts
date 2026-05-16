import { ref } from 'vue'
import type { Article, ArticleListResponse } from '@/types'

interface UseArticleListOptions {
  perPage?: number
  fetchFn: (page: number, limit: number) => Promise<{ data: ArticleListResponse }>
}

export function useArticleList(options: UseArticleListOptions) {
  const { perPage = 9, fetchFn } = options

  const articles = ref<Article[]>([])
  const loading = ref(true)
  const loadingMore = ref(false)
  const page = ref(1)
  const totalArticles = ref(0)
  const totalPages = ref(1)

  const loadArticles = async (pageNum: number) => {
    loading.value = true
    page.value = pageNum
    try {
      const { data } = await fetchFn(pageNum, perPage)
      articles.value = data.data
      totalArticles.value = data.total
      totalPages.value = Math.ceil(data.total / perPage) || 1
    } finally {
      loading.value = false
    }
  }

  const loadMore = async () => {
    if (loadingMore.value || page.value >= totalPages.value) return
    loadingMore.value = true
    page.value++
    try {
      const { data } = await fetchFn(page.value, perPage)
      articles.value.push(...data.data)
      totalArticles.value = data.total
      totalPages.value = Math.ceil(data.total / perPage) || 1
    } finally {
      loadingMore.value = false
    }
  }

  const resetAndLoad = async () => {
    page.value = 1
    await loadArticles(1)
  }

  return { articles, loading, loadingMore, page, totalArticles, totalPages, loadArticles, loadMore, resetAndLoad }
}

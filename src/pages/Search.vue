<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import { articleApi } from '@/api'
import type { Article } from '@/types'
import { useMeta } from '@/composables/useMeta'
import { Search as SearchIcon, Terminal, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const route = useRoute()
const PER_PAGE = 9

const articles = ref<Article[]>([])
const loading = ref(true)
const page = ref(1)
const totalArticles = ref(0)
const searchQuery = ref('')
const totalPages = ref(1)

const { setDefaultMeta } = useMeta()
setDefaultMeta('搜索')

const loadResults = async (pageNum: number) => {
  const q = (route.query.q as string) || ''
  searchQuery.value = q
  if (!q) {
    articles.value = []
    totalArticles.value = 0
    totalPages.value = 1
    loading.value = false
    return
  }

  loading.value = true
  try {
    const { data } = await articleApi.getList(pageNum, PER_PAGE, { search: q })
    articles.value = data.data
    totalArticles.value = data.total
    totalPages.value = Math.ceil(data.total / PER_PAGE)
    page.value = pageNum
  } catch (error) {
    console.error('Search failed:', error)
    articles.value = []
  } finally {
    loading.value = false
  }
}

const goToPage = (p: number) => {
  if (p < 1 || p > totalPages.value) return
  loadResults(p)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(() => route.query.q, () => {
  loadResults(1)
})

onMounted(() => {
  loadResults(1)
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-6xl mx-auto px-4 py-16">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-8">
        <SearchIcon class="w-5 h-5 text-primary" />
        <h1 class="font-mono text-2xl font-bold">
          <span class="text-primary">~/</span><span class="text-text-primary">search</span>
        </h1>
      </div>

      <!-- Search query display -->
      <div v-if="searchQuery" class="mb-8">
        <p class="font-mono text-sm text-text-secondary">
          <span class="text-primary">$</span> grep -r "
          <span class="text-accent">{{ searchQuery }}</span>" ./posts
        </p>
        <p v-if="!loading" class="font-mono text-xs text-text-dim mt-2">
          {{ totalArticles }} result{{ totalArticles !== 1 ? 's' : '' }} found
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="card animate-pulse">
          <div class="p-5 space-y-3">
            <div class="h-3 bg-bg-elevated rounded w-1/4" />
            <div class="h-4 bg-bg-elevated rounded w-3/4" />
            <div class="h-3 bg-bg-elevated rounded w-full" />
            <div class="h-3 bg-bg-elevated rounded w-1/2" />
          </div>
        </div>
      </div>

      <!-- Results -->
      <div v-else-if="articles.length > 0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ArticleCard
            v-for="article in articles"
            :key="article.id"
            :article="article"
          />
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 mt-12">
          <button
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
            class="btn btn-ghost flex items-center gap-1"
          >
            <ChevronLeft class="w-4 h-4" />
            <span class="font-mono text-sm">prev</span>
          </button>

          <div class="flex items-center gap-2">
            <button
              v-for="p in totalPages"
              :key="p"
              @click="goToPage(p)"
              class="w-8 h-8 rounded-lg font-mono text-xs transition-all"
              :class="p === page
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-text-dim hover:bg-bg-elevated hover:text-text-primary border border-transparent'"
            >
              {{ p }}
            </button>
          </div>

          <button
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
            class="btn btn-ghost flex items-center gap-1"
          >
            <span class="font-mono text-sm">next</span>
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="card p-12 text-center">
        <Terminal class="w-12 h-12 text-text-dim mx-auto mb-4" />
        <p class="font-mono text-text-dim mb-2">
          <span class="text-primary">$</span> grep -r "
          <span class="text-accent">{{ searchQuery || 'keyword' }}</span>" ./posts
        </p>
        <p class="font-mono text-sm text-text-dim">
          <span class="text-accent" v-if="searchQuery">No matches found.</span>
          <span v-else>Type a keyword to search.</span>
        </p>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import { articleApi } from '@/api'
import type { Article } from '@/types'
import { Folder, ChevronLeft, ChevronRight, Terminal } from 'lucide-vue-next'
import { useMeta } from '@/composables/useMeta'

const PER_PAGE = 12

const route = useRoute()
const articles = ref<Article[]>([])
const loading = ref(true)
const categoryName = ref('')
const page = ref(1)
const totalArticles = ref(0)

const totalPages = ref(1)

const loadArticles = async (pageNum: number) => {
  loading.value = true
  page.value = pageNum
  try {
    const { data } = await articleApi.getList(pageNum, PER_PAGE, { category: categoryName.value })
    articles.value = data.data
    totalArticles.value = data.total
    totalPages.value = Math.ceil(data.total / PER_PAGE) || 1
  } catch (error) {
    console.error('Failed to load articles:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  categoryName.value = route.params.name as string
  await loadArticles(1)
})

const { setDefaultMeta } = useMeta()

watch(() => route.params.name, (newName) => {
  categoryName.value = newName as string
  loadArticles(1)
})

watch(categoryName, (name) => {
  if (name) setDefaultMeta(`分类: ${name}`)
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-6 text-xs font-mono text-text-dim">
        <router-link to="/" class="hover:text-primary transition-colors">~/home</router-link>
        <span>/</span>
        <span class="text-text-secondary">categories</span>
        <span>/</span>
        <span class="text-primary">{{ categoryName }}</span>
      </div>

      <header class="mb-10">
        <div class="flex items-center gap-3 mb-3">
          <Folder class="w-5 h-5 text-primary" />
          <h1 class="font-mono text-2xl font-bold text-text-primary">
            category: <span class="text-primary">{{ categoryName }}</span>
          </h1>
        </div>
        <p class="font-mono text-sm text-text-dim">
          <span class="text-secondary">$</span> ls ./{{ categoryName }} <span class="text-text-secondary"># {{ articles.length }} entries</span>
        </p>
      </header>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="card animate-pulse">
          <div class="aspect-video bg-bg-elevated" />
          <div class="p-5 space-y-3">
            <div class="h-3 bg-bg-elevated rounded w-1/4" />
            <div class="h-4 bg-bg-elevated rounded w-3/4" />
            <div class="h-3 bg-bg-elevated rounded w-full" />
          </div>
        </div>
      </div>

      <div v-else-if="articles.length > 0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ArticleCard
            v-for="(article, index) in articles"
            :key="article.id"
            :article="article"
            :style="{ 'animation-delay': `${index * 0.1}s` }"
          />
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 mt-10">
          <button
            @click="loadArticles(page - 1)"
            :disabled="page <= 1"
            class="btn btn-ghost flex items-center gap-1 !px-4"
            :class="{ 'opacity-30 cursor-not-allowed': page <= 1 }"
          >
            <ChevronLeft class="w-4 h-4" />
            <span class="font-mono text-xs">prev</span>
          </button>

          <div class="flex items-center gap-2 font-mono text-xs text-text-dim">
            <span class="px-3 py-1.5 bg-bg-elevated rounded-lg border border-border-subtle text-primary font-bold">{{ page }}</span>
            <span>/</span>
            <span>{{ totalPages }}</span>
          </div>

          <button
            @click="loadArticles(page + 1)"
            :disabled="page >= totalPages"
            class="btn btn-ghost flex items-center gap-1 !px-4"
            :class="{ 'opacity-30 cursor-not-allowed': page >= totalPages }"
          >
            <span class="font-mono text-xs">next</span>
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-else class="card p-12 text-center">
        <Terminal class="w-12 h-12 text-text-dim mx-auto mb-4" />
        <p class="font-mono text-text-dim">
          <span class="text-primary">$</span> ls ./{{ categoryName }}<br>
          <span class="text-accent">No articles found in this category.</span>
        </p>
        <router-link to="/" class="btn btn-primary mt-6 inline-flex">
          <ChevronLeft class="w-4 h-4 mr-1" /> back to home
        </router-link>
      </div>
    </div>
  </DefaultLayout>
</template>

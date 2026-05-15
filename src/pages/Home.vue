<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useMeta } from '@/composables/useMeta'
import ArticleCard from '@/components/ArticleCard.vue'
import { articleApi, categoryApi, tagApi } from '@/api'
import type { Article, Category, Tag } from '@/types'
import { Folder, Tag as TagIcon, ChevronRight, ChevronDown } from 'lucide-vue-next'

const PER_PAGE = 9

const articles = ref<Article[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const totalArticles = ref(0)

const hasMore = computed(() => articles.value.length < totalArticles.value)

const loadArticles = async (pageNum: number, append = false) => {
  if (!append) loading.value = true
  try {
    const { data } = await articleApi.getList(pageNum, PER_PAGE)
    if (append) {
      articles.value.push(...data.data)
    } else {
      articles.value = data.data
    }
    totalArticles.value = data.total
    page.value = pageNum
  } catch (error) {
    console.error('Failed to load articles:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  await loadArticles(page.value + 1, true)
}

const loadCategories = async () => {
  try {
    const { data } = await categoryApi.getAll()
    categories.value = data.data
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const loadTags = async () => {
  try {
    const { data } = await tagApi.getAll()
    tags.value = data.data
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

onMounted(async () => {
  await Promise.all([loadArticles(1), loadCategories(), loadTags()])
})

const handleCategoryClick = (categoryName: string) => {
  window.location.href = `/category/${encodeURIComponent(categoryName)}`
}

const handleTagClick = (tagName: string) => {
  window.location.href = `/tag/${encodeURIComponent(tagName)}`
}

const { setDefaultMeta } = useMeta()
setDefaultMeta()
</script>

<template>
  <DefaultLayout>
    <!-- Hero Section -->
    <section class="relative py-24 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div class="absolute inset-0 bg-grid-pattern" />
      
      <div class="relative max-w-4xl mx-auto px-4 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-subtle rounded-full mb-8 animate-fade-in">
          <div class="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
          <span class="font-mono text-xs text-text-secondary">system.online</span>
        </div>

        <h1 class="font-mono text-6xl md:text-8xl font-bold mb-6 animate-fade-in-up" style="animation-delay: 0.1s">
          <span class="text-primary glow-text">~/</span><span class="text-text-primary">blog</span>
        </h1>

        <p class="text-text-secondary text-lg md:text-xl max-w-xl mx-auto mb-8 animate-fade-in-up font-mono" style="animation-delay: 0.2s">
          <span class="text-primary">const</span> thought = <span class="text-secondary">'code & life'</span><span class="animate-flicker">_</span>
        </p>

        <div class="flex items-center justify-center gap-4 animate-fade-in-up" style="animation-delay: 0.3s">
          <a href="https://github.com/yzq745752" target="_blank" rel="noopener" class="btn btn-primary">
            <span class="text-primary">$</span> github
          </a>
          <a href="#articles" class="btn btn-ghost">
            <span class="text-secondary">></span> read-logs
          </a>
        </div>
      </div>

      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-primary/20 to-transparent" />
    </section>

    <!-- Main Content -->
    <section id="articles" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Articles Grid -->
        <div class="lg:col-span-3">
          <div class="flex items-center gap-2 mb-6">
            <Folder class="w-4 h-4 text-primary" />
            <h2 class="font-mono text-sm text-text-secondary uppercase tracking-wider">latest_posts</h2>
          </div>

          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="card animate-pulse">
              <div class="aspect-video bg-bg-elevated" />
              <div class="p-5 space-y-3">
                <div class="h-3 bg-bg-elevated rounded w-1/4" />
                <div class="h-4 bg-bg-elevated rounded w-3/4" />
                <div class="h-3 bg-bg-elevated rounded w-full" />
                <div class="h-3 bg-bg-elevated rounded w-1/2" />
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

            <!-- Load More -->
            <div v-if="hasMore" class="flex justify-center mt-10">
              <button
                @click="loadMore"
                :disabled="loadingMore"
                class="btn btn-ghost flex items-center gap-2 px-8"
              >
                <ChevronDown class="w-4 h-4" :class="{ 'animate-bounce': !loadingMore }" />
                <span class="font-mono text-sm">
                  {{ loadingMore ? 'loading...' : `load more (${articles.length}/${totalArticles})` }}
                </span>
              </button>
            </div>
          </div>

          <div v-else class="card p-12 text-center">
            <p class="font-mono text-text-dim">
              <span class="text-primary">$</span> ls ./posts<br>
              <span class="text-accent">No posts found.</span>
            </p>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="space-y-6">
          <!-- Categories -->
          <div class="card">
            <div class="card-header">
              <Folder class="w-3 h-3 text-primary" />
              <span class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider">categories</span>
            </div>
            <div class="p-4 space-y-1">
              <button
                v-for="category in categories"
                :key="category.id"
                @click="handleCategoryClick(category.name)"
                class="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-bg-hover transition-all group text-left"
              >
                <span class="font-mono text-sm text-text-primary group-hover:text-primary transition-colors">
                  {{ category.name }}
                </span>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs text-text-dim">{{ category.articleCount || 0 }}</span>
                  <ChevronRight class="w-3 h-3 text-text-dim group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            </div>
          </div>

          <!-- Tags -->
          <div class="card">
            <div class="card-header">
              <TagIcon class="w-3 h-3 text-secondary" />
              <span class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider">tags</span>
            </div>
            <div class="p-4 flex flex-wrap gap-2">
              <button
                v-for="tag in tags"
                :key="tag.id"
                @click="handleTagClick(tag.name)"
                class="badge badge-secondary hover:bg-secondary/20 hover:border-secondary/50 transition-all"
              >
                {{ tag.name }} <span class="text-text-dim ml-1">({{ tag.articleCount || 0 }})</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </DefaultLayout>
</template>

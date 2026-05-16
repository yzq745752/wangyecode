<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import { articleApi } from '@/api'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useMeta } from '@/composables/useMeta'
import { useArticleList } from '@/composables/useArticleList'

const PER_PAGE = 12

const route = useRoute()
const tagName = ref(route.params.name as string)

const fetchFn = (page: number, limit: number) =>
  articleApi.getList(page, limit, { tag: tagName.value })

const { articles, loading, page, totalPages, loadArticles } = useArticleList({ fetchFn, perPage: PER_PAGE })

onMounted(async () => {
  await loadArticles(1)
})

const { setDefaultMeta } = useMeta()

watch(() => route.params.name, (newName) => {
  tagName.value = newName as string
  loadArticles(1)
})

watch(tagName, (name) => {
  if (name) setDefaultMeta(`标签: ${name}`)
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header class="mb-12">
        <h1 class="font-serif text-4xl font-bold text-text-dark mb-2">
          标签: #{{ tagName }}
        </h1>
        <p class="text-text-light">
          共 {{ articles.length }} 篇文章
        </p>
      </header>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="card animate-pulse">
          <div class="aspect-video bg-gray-200" />
          <div class="p-6 space-y-3">
            <div class="h-4 bg-gray-200 rounded w-1/4" />
            <div class="h-6 bg-gray-200 rounded w-3/4" />
            <div class="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>

      <div v-else-if="articles.length > 0">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ArticleCard
            v-for="article in articles"
            :key="article.id"
            :article="article"
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

      <div v-else class="text-center py-20">
        <p class="text-text-light text-lg">该标签下暂无文章</p>
      </div>
    </div>
  </DefaultLayout>
</template>

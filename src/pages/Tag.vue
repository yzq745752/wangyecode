<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import { articleApi } from '@/api'
import type { Article } from '@/types'

const route = useRoute()
const articles = ref<Article[]>([])
const loading = ref(true)
const tagName = ref('')

onMounted(async () => {
  loading.value = true
  tagName.value = route.params.name as string
  try {
    const { data } = await articleApi.getList(1, 99, { tag: tagName.value })
    articles.value = data.data
  } catch (error) {
    console.error('Failed to load articles:', error)
  } finally {
    loading.value = false
  }
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

      <div v-else-if="articles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ArticleCard
          v-for="article in articles"
          :key="article.id"
          :article="article"
        />
      </div>

      <div v-else class="text-center py-20">
        <p class="text-text-light text-lg">该标签下暂无文章</p>
      </div>
    </div>
  </DefaultLayout>
</template>

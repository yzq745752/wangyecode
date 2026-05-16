<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { articleApi } from '@/api'
import { ArrowRight, BookOpen } from 'lucide-vue-next'

interface RelatedArticle {
  id: number
  title: string
  summary: string
  coverImage: string | null
  categoryId: number
  categoryName: string
  createdAt: string
  viewCount: number
  tagMatchCount: number
}

const props = defineProps<{
  articleId: number
}>()

const articles = ref<RelatedArticle[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await articleApi.getRelated(props.articleId)
    articles.value = data.data as unknown as RelatedArticle[]
  } catch (e) {
    console.error('Failed to load related articles:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="mt-12">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="i in 2" :key="i" class="card animate-pulse p-5">
        <div class="h-3 bg-bg-elevated rounded w-1/4 mb-3" />
        <div class="h-4 bg-bg-elevated rounded w-3/4 mb-2" />
        <div class="h-3 bg-bg-elevated rounded w-1/2" />
      </div>
    </div>
  </div>

  <div v-else-if="articles.length > 0" class="mt-12 border-t border-border-subtle pt-10">
    <div class="flex items-center gap-2 mb-6">
      <BookOpen class="w-5 h-5 text-secondary" />
      <h2 class="font-mono text-lg font-bold text-text-primary">related_articles</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link
        v-for="article in articles"
        :key="article.id"
        :to="`/article/${article.id}`"
        class="related-card group"
      >
        <div class="flex items-center gap-2 mb-3">
          <span class="badge badge-primary text-xs">{{ article.categoryName }}</span>
          <span v-if="article.tagMatchCount > 0" class="badge badge-dim text-xs">
            {{ article.tagMatchCount }} tags match
          </span>
        </div>

        <h3 class="font-display text-base font-bold text-text-primary mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {{ article.title }}
        </h3>

        <p v-if="article.summary" class="text-xs text-text-secondary line-clamp-2 mb-3">
          {{ article.summary }}
        </p>

        <div class="flex items-center justify-between text-xs text-text-dim font-mono">
          <span>{{ new Date(article.createdAt).toLocaleDateString('zh-CN') }}</span>
          <span class="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            read <ArrowRight class="w-3 h-3" />
          </span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.related-card {
  @apply p-5 bg-bg-elevated/50 rounded-xl border border-border-subtle
         hover:border-primary/20 hover:bg-bg-elevated
         transition-all duration-300 block;
}
</style>

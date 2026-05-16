<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { articleApi } from '@/api'
import type { Article } from '@/types'
import { Calendar, Archive, ChevronRight } from 'lucide-vue-next'
import { useMeta } from '@/composables/useMeta'

const { setDefaultMeta } = useMeta()
setDefaultMeta('归档')

const articles = ref<Article[]>([])
const loading = ref(true)

const grouped = computed(() => {
  const groups: { year: string; months: { month: string; articles: Article[] }[] }[] = []
  const yearMap = new Map<string, Map<string, Article[]>>()

  for (const article of articles.value) {
    const d = new Date(article.createdAt)
    const year = d.getFullYear().toString()
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    if (!yearMap.has(year)) yearMap.set(year, new Map())
    const monthMap = yearMap.get(year)!
    if (!monthMap.has(month)) monthMap.set(month, [])
    monthMap.get(month)!.push(article)
  }

  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => parseInt(b) - parseInt(a))
  for (const year of sortedYears) {
    const monthMap = yearMap.get(year)!
    const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a))
    const months = sortedMonths.map(month => ({
      month,
      articles: monthMap.get(month)!.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }))
    groups.push({ year, months })
  }

  return groups
})

const totalCount = computed(() => articles.value.length)

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await articleApi.getList(1, 999)
    articles.value = data.data
  } catch (e) {
    console.error('Failed to load articles:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-4xl mx-auto px-4 py-16">
      <!-- Header -->
      <div class="flex items-center gap-2 mb-8">
        <Archive class="w-5 h-5 text-primary" />
        <h1 class="font-mono text-2xl font-bold text-text-primary">
          <span class="text-primary">~/</span><span class="text-text-primary">archive</span>
        </h1>
        <span v-if="!loading" class="font-mono text-xs text-text-dim bg-bg-elevated px-2 py-0.5 rounded ml-2">
          {{ totalCount }} posts
        </span>
      </div>

      <div v-if="loading" class="space-y-6">
        <div v-for="i in 4" :key="i" class="animate-pulse space-y-3">
          <div class="h-6 bg-bg-elevated rounded w-24" />
          <div class="h-4 bg-bg-elevated rounded w-3/4 ml-8" />
          <div class="h-4 bg-bg-elevated rounded w-1/2 ml-8" />
        </div>
      </div>

      <div v-else-if="articles.length === 0" class="card p-12 text-center">
        <Calendar class="w-12 h-12 text-text-dim mx-auto mb-4" />
        <p class="font-mono text-text-dim">
          <span class="text-primary">$</span> ls ./archive<br>
          <span class="text-accent">No articles yet.</span>
        </p>
      </div>

      <div v-else class="space-y-10">
        <div v-for="group in grouped" :key="group.year" class="archive-year">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span class="font-mono text-xl font-bold text-primary">{{ group.year }}</span>
              </div>
              <div class="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
            </div>

          <div v-for="monthGroup in group.months" :key="monthGroup.month" class="ml-6 mb-6">
            <div class="flex items-center gap-2 mb-4">
              <Calendar class="w-4 h-4 text-secondary" />
              <span class="font-mono text-sm font-bold text-text-secondary">
                {{ monthGroup.month }}
              </span>
              <span class="font-mono text-xs text-text-dim">
                ({{ monthGroup.articles.length }})
              </span>
            </div>

            <div class="space-y-2 ml-6 border-l-2 border-border-subtle pl-6">
              <router-link
                v-for="article in monthGroup.articles"
                :key="article.id"
                :to="`/article/${article.id}`"
                class="archive-item group"
              >
                <div class="archive-dot" />
                <span class="font-mono text-xs text-text-dim w-12 flex-shrink-0">
                  {{ new Date(article.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) }}
                </span>
                <span class="font-mono text-sm text-text-primary group-hover:text-primary transition-colors flex-1 truncate">
                  {{ article.title }}
                </span>
                <ChevronRight class="w-3.5 h-3.5 text-text-dim group-hover:text-primary transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.archive-item {
  @apply flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-bg-hover transition-all relative;
}

.archive-dot {
  @apply absolute -left-[1.85rem] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border-subtle border-2 border-bg-dark;
}

.archive-item:hover .archive-dot {
  @apply bg-primary border-primary/30;
}
</style>

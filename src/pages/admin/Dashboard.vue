<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Folder, Tag, Eye, Terminal } from 'lucide-vue-next'
import { articleApi, categoryApi, tagApi } from '@/api'

const stats = ref({
  articles: 0,
  categories: 0,
  tags: 0,
  views: 0,
})

onMounted(async () => {
  try {
    const [articlesRes, categoriesRes, tagsRes] = await Promise.all([
      articleApi.getList(1, 100),
      categoryApi.getAll(),
      tagApi.getAll(),
    ])

    stats.value.articles = articlesRes.data.total
    stats.value.categories = categoriesRes.data.data.length
    stats.value.tags = tagsRes.data.data.length
    stats.value.views = articlesRes.data.data.reduce((sum: number, a: any) => sum + a.viewCount, 0)
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
})

const statCards = [
  { label: 'articles', value: () => stats.value.articles, icon: FileText, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { label: 'categories', value: () => stats.value.categories, icon: Folder, color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
  { label: 'tags', value: () => stats.value.tags, icon: Tag, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  { label: 'total_views', value: () => stats.value.views, icon: Eye, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
]
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <Terminal class="w-4 h-4 text-primary" />
      <h1 class="font-mono text-xl font-bold text-text-primary">dashboard</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div
        v-for="stat in statCards"
        :key="stat.label"
        class="card p-5"
      >
        <div class="flex items-center justify-between mb-3">
          <div :class="[stat.bg, stat.border, 'border p-2.5 rounded-lg']">
            <component :is="stat.icon" :class="[stat.color, 'w-5 h-5']" />
          </div>
          <div class="w-2 h-2 rounded-full bg-primary/30" />
        </div>
        <h3 class="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">{{ stat.label }}</h3>
        <p class="text-2xl font-bold text-text-primary font-mono">{{ stat.value() }}</p>
      </div>
    </div>

    <div class="card p-6">
      <div class="card-header mb-4">
        <div class="card-header-dot" />
        <h2 class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider">quick_actions</h2>
      </div>
      <div class="flex flex-wrap gap-3">
        <router-link to="/admin/articles/new" class="btn btn-primary">
          <span class="text-primary">+</span> new-article
        </router-link>
        <router-link to="/admin/categories" class="btn btn-secondary">
          <span class="text-secondary">&gt;</span> manage-categories
        </router-link>
        <router-link to="/admin/tags" class="btn btn-secondary">
          <span class="text-accent">#</span> manage-tags
        </router-link>
      </div>
    </div>
  </div>
</template>

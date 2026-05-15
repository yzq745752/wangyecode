<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MessageSquare, FileText, Folder, Tag, Eye, Terminal, Download, BarChart3 } from 'lucide-vue-next'
import { articleApi, categoryApi, tagApi, adminCommentApi } from '@/api'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const stats = ref({
  articles: 0,
  categories: 0,
  tags: 0,
  views: 0,
  pendingComments: 0,
})

interface ViewDay {
  date: string
  label: string
  views: number
}

const articles = ref<any[]>([])
const viewChart = ref<ViewDay[]>([])

onMounted(async () => {
  try {
    const [articlesRes, categoriesRes, tagsRes, commentsRes] = await Promise.all([
      articleApi.getList(1, 100),
      categoryApi.getAll(),
      tagApi.getAll(),
      adminCommentApi.getAll().catch(() => ({ data: { data: [], total: 0 } })),
    ])

    articles.value = articlesRes.data.data
    stats.value.articles = articlesRes.data.total
    stats.value.categories = categoriesRes.data.data.length
    stats.value.tags = tagsRes.data.data.length
    stats.value.views = articles.value.reduce((sum: number, a: any) => sum + a.viewCount, 0)
    stats.value.pendingComments = commentsRes.data.data.filter((c: any) => !c.isApproved).length

    // Build daily view chart (last 7 days with data, or all article dates)
    const dayMap = new Map<string, number>()
    // Create entries for each article day
    for (const a of articles.value) {
      const day = new Date(a.createdAt).toISOString().slice(0, 10)
      dayMap.set(day, (dayMap.get(day) || 0) + a.viewCount)
    }
    // Sort descending, take up to 14
    const sorted = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).reverse()
    viewChart.value = sorted.map(([date, views]) => ({
      date,
      label: date.slice(5), // MM-DD
      views,
    }))
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
})

const maxViews = computed(() => Math.max(...viewChart.value.map(d => d.views), 1))
const barHeight = 120

const handleExport = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/export', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blog-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('数据导出成功')
  } catch (e) {
    toast.error('导出失败')
  }
}

const statCards = [
  { label: 'articles', value: () => stats.value.articles, icon: FileText, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { label: 'categories', value: () => stats.value.categories, icon: Folder, color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
  { label: 'tags', value: () => stats.value.tags, icon: Tag, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  { label: 'total_views', value: () => stats.value.views, icon: Eye, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { label: 'pending_comments', value: () => stats.value.pendingComments, icon: MessageSquare, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
]
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <Terminal class="w-4 h-4 text-primary" />
      <h1 class="font-mono text-xl font-bold text-text-primary">dashboard</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
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

    <!-- View Chart -->
    <div v-if="viewChart.length > 0" class="card p-6 mb-8">
      <div class="flex items-center gap-2 mb-6">
        <BarChart3 class="w-4 h-4 text-primary" />
        <h2 class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider">views_by_day</h2>
      </div>
      <div class="flex items-end gap-3 h-[140px]">
        <div
          v-for="day in viewChart"
          :key="day.date"
          class="flex-1 flex flex-col items-center justify-end h-full"
        >
          <span class="font-mono text-xs text-text-dim mb-1">{{ day.views }}</span>
          <div
            class="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-primary/40 to-primary/80 hover:from-primary/60 hover:to-primary transition-all cursor-pointer"
            :style="{ height: (day.views / maxViews * barHeight) + 'px' }"
          />
          <span class="font-mono text-[10px] text-text-dim mt-2">{{ day.label }}</span>
        </div>
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
        <router-link to="/admin/comments" class="btn btn-ghost">
          <span class="text-primary">&gt;</span> manage-comments
        </router-link>
        <router-link to="/admin/images" class="btn btn-ghost">
          <span class="text-primary">&gt;</span> images
        </router-link>
        <button @click="handleExport" class="btn btn-ghost flex items-center gap-2">
          <Download class="w-4 h-4 text-primary" />
          <span>export-data</span>
        </button>
      </div>
    </div>
  </div>
</template>

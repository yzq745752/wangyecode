<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Eye, Folder, Terminal } from 'lucide-vue-next'
import { articleApi } from '@/api'
import type { Article } from '@/types'

const router = useRouter()
const articles = ref<Article[]>([])
const loading = ref(true)

const loadArticles = async () => {
  loading.value = true
  try {
    const { data } = await articleApi.getList(1, 100)
    articles.value = data.data
  } catch (error) {
    console.error('Failed to load articles:', error)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('确认删除此文章？')) return
  try {
    await articleApi.delete(id)
    await loadArticles()
  } catch (error) {
    console.error('Failed to delete article:', error)
  }
}

onMounted(loadArticles)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-2">
        <Folder class="w-4 h-4 text-primary" />
        <h1 class="font-mono text-xl font-bold text-text-primary">articles</h1>
      </div>
      <router-link to="/admin/articles/new" class="btn btn-primary flex items-center gap-2">
        <Plus class="w-4 h-4" />
        new
      </router-link>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-8">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 5" :key="i" class="h-14 bg-bg-elevated rounded" />
        </div>
      </div>

      <div v-else-if="articles.length > 0">
        <table class="w-full">
          <thead class="bg-bg-elevated/50 border-b border-border-subtle">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">title</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">category</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">date</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">views</th>
              <th class="px-5 py-3 text-right text-xs font-mono font-medium text-text-dim uppercase tracking-wider">actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="article in articles" :key="article.id" class="hover:bg-bg-hover/50 transition-colors">
              <td class="px-5 py-3">
                <div class="font-mono text-sm text-text-primary">{{ article.title }}</div>
                <div class="text-xs text-text-dim line-clamp-1 mt-0.5">{{ article.summary }}</div>
              </td>
              <td class="px-5 py-3">
                <span class="badge badge-primary text-xs">
                  {{ article.category.name }}
                </span>
              </td>
              <td class="px-5 py-3 text-xs text-text-dim font-mono">
                {{ new Date(article.createdAt).toLocaleDateString('zh-CN') }}
              </td>
              <td class="px-5 py-3 text-xs text-text-dim font-mono">
                <div class="flex items-center gap-1">
                  <Eye class="w-3 h-3" />
                  {{ article.viewCount }}
                </div>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex justify-end gap-1">
                  <router-link
                    :to="`/article/${article.id}`"
                    class="p-1.5 text-text-dim hover:text-primary transition-colors"
                  >
                    <Eye class="w-4 h-4" />
                  </router-link>
                  <router-link
                    :to="`/admin/articles/edit/${article.id}`"
                    class="p-1.5 text-text-dim hover:text-secondary transition-colors"
                  >
                    <Edit class="w-4 h-4" />
                  </router-link>
                  <button
                    @click="handleDelete(article.id)"
                    class="p-1.5 text-text-dim hover:text-accent transition-colors"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="p-12 text-center">
        <p class="font-mono text-text-dim mb-4">
          <span class="text-primary">$</span> ls ./articles<br>
          <span class="text-accent">No articles found.</span>
        </p>
        <router-link to="/admin/articles/new" class="btn btn-primary">
          create first article
        </router-link>
      </div>
    </div>
  </div>
</template>

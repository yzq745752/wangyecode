<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminCommentApi } from '@/api'
import { MessageSquare, Check, X, Trash2, ExternalLink } from 'lucide-vue-next'

interface AdminComment {
  id: number
  articleId: number
  articleTitle: string
  author: string
  content: string
  isApproved: number
  createdAt: string
}

const comments = ref<AdminComment[]>([])
const loading = ref(true)

const loadComments = async () => {
  loading.value = true
  try {
    const { data } = await adminCommentApi.getAll()
    comments.value = data.data as unknown as AdminComment[]
  } catch (e) {
    console.error('Failed to load comments:', e)
  } finally {
    loading.value = false
  }
}

const handleApprove = async (id: number, approved: number) => {
  try {
    await adminCommentApi.approve(id, approved)
    await loadComments()
  } catch (e) {
    console.error('Failed to approve comment:', e)
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('确认删除此评论？')) return
  try {
    await adminCommentApi.delete(id)
    await loadComments()
  } catch (e) {
    console.error('Failed to delete comment:', e)
  }
}

onMounted(loadComments)
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <MessageSquare class="w-4 h-4 text-primary" />
      <h1 class="font-mono text-xl font-bold text-text-primary">comments</h1>
      <span class="font-mono text-xs text-text-dim bg-bg-elevated px-2 py-0.5 rounded">
        {{ comments.length }}
      </span>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-8">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 5" :key="i" class="h-16 bg-bg-elevated rounded" />
        </div>
      </div>

      <div v-else-if="comments.length > 0">
        <table class="w-full">
          <thead class="bg-bg-elevated/50 border-b border-border-subtle">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase">author</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase">comment</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase hidden md:table-cell">article</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase hidden md:table-cell">date</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase">status</th>
              <th class="px-5 py-3 text-right text-xs font-mono font-medium text-text-dim uppercase">actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr
              v-for="comment in comments"
              :key="comment.id"
              class="hover:bg-bg-hover transition-colors"
              :class="{ 'opacity-50': !comment.isApproved }"
            >
              <td class="px-5 py-4">
                <div class="font-mono text-sm text-text-primary">{{ comment.author }}</div>
              </td>
              <td class="px-5 py-4">
                <div class="text-sm text-text-secondary line-clamp-2 max-w-xs">{{ comment.content }}</div>
              </td>
              <td class="px-5 py-4 hidden md:table-cell">
                <div class="flex items-center gap-1">
                  <span class="font-mono text-xs text-text-dim line-clamp-1">{{ comment.articleTitle || '—' }}</span>
                  <router-link :to="`/article/${comment.articleId}`" target="_blank" class="text-text-dim hover:text-primary flex-shrink-0">
                    <ExternalLink class="w-3 h-3" />
                  </router-link>
                </div>
              </td>
              <td class="px-5 py-4 hidden md:table-cell font-mono text-xs text-text-dim">
                {{ new Date(comment.createdAt).toLocaleDateString('zh-CN') }}
              </td>
              <td class="px-5 py-4">
                <span
                  class="badge text-xs"
                  :class="comment.isApproved ? 'badge-primary' : 'badge-dim'"
                >
                  {{ comment.isApproved ? 'approved' : 'pending' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="flex justify-end gap-1">
                  <button
                    v-if="!comment.isApproved"
                    @click="handleApprove(comment.id, 1)"
                    class="p-1.5 text-text-dim hover:text-primary transition-colors"
                    title="Approve"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                  <button
                    v-else
                    @click="handleApprove(comment.id, 0)"
                    class="p-1.5 text-text-dim hover:text-secondary transition-colors"
                    title="Reject"
                  >
                    <X class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDelete(comment.id)"
                    class="p-1.5 text-text-dim hover:text-accent transition-colors"
                    title="Delete"
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
        <MessageSquare class="w-12 h-12 text-text-dim mx-auto mb-4" />
        <p class="font-mono text-text-dim">
          <span class="text-primary">$</span> ls ./comments<br>
          <span class="text-accent">No comments yet.</span>
        </p>
      </div>
    </div>
  </div>
</template>

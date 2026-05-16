<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { commentApi } from '@/api'
import type { Comment } from '@/types'
import { MessageSquare, Reply, User, Mail, Send } from 'lucide-vue-next'

const props = defineProps<{
  articleId: number
}>()

const comments = ref<Comment[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref('')

// Form state
const author = ref('')
const email = ref('')
const content = ref('')
const replyTo = ref<{ id: number; author: string } | null>(null)

const loadComments = async () => {
  loading.value = true
  try {
    const { data } = await commentApi.getByArticle(props.articleId)
    comments.value = data.data
  } catch (e) {
    console.error('Failed to load comments:', e)
  } finally {
    loading.value = false
  }
}

const submitComment = async () => {
  if (!author.value.trim() || !content.value.trim()) return

  submitting.value = true
  error.value = ''
  success.value = ''
  try {
    const body: any = { author: author.value, email: email.value, content: content.value }
    if (replyTo.value) body.parentId = replyTo.value.id

    await commentApi.create(props.articleId, body)
    success.value = '评论已提交，等待审核'
    content.value = ''
    replyTo.value = null
    // Reload to show new comment if auto-approved (though it won't be)
    setTimeout(() => { success.value = '' }, 4000)
  } catch (e: any) {
    error.value = e.response?.data?.message || '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}

const startReply = (comment: Comment) => {
  replyTo.value = { id: comment.id, author: comment.author }
  // Scroll to form
  document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' })
}

const cancelReply = () => {
  replyTo.value = null
}

onMounted(loadComments)
</script>

<template>
  <div class="mt-16 border-t border-border-subtle pt-10">
    <!-- Section Header -->
    <div class="flex items-center gap-2 mb-8">
      <MessageSquare class="w-5 h-5 text-primary" />
      <h2 class="font-mono text-lg font-bold text-text-primary">comments</h2>
      <span v-if="comments.length > 0" class="font-mono text-xs text-text-dim bg-bg-elevated px-2 py-0.5 rounded">
        {{ comments.length }}
      </span>
    </div>

    <!-- Comments List -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="h-20 bg-bg-elevated rounded-xl" />
      </div>
    </div>

    <div v-else-if="comments.length > 0" class="space-y-5 mb-10">
      <div v-for="comment in comments" :key="comment.id" class="comment-card">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-border-subtle flex items-center justify-center flex-shrink-0">
            <span class="font-mono text-xs font-bold text-primary">{{ comment.author.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-sm font-bold text-text-primary">{{ comment.author }}</span>
              <span class="font-mono text-xs text-text-dim">{{ new Date(comment.createdAt).toLocaleDateString('zh-CN') }}</span>
            </div>
            <p class="text-sm text-text-secondary leading-relaxed">{{ comment.content }}</p>
            <button
              @click="startReply(comment)"
              class="mt-2 flex items-center gap-1 text-xs font-mono text-text-dim hover:text-primary transition-colors"
            >
              <Reply class="w-3 h-3" />
              reply
            </button>

            <!-- Nested replies -->
            <div v-if="comment.replies && comment.replies.length > 0" class="mt-4 ml-4 pl-4 border-l-2 border-border-subtle space-y-4">
              <div v-for="reply in comment.replies" :key="reply.id" class="flex items-start gap-3">
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/10 border border-border-subtle flex items-center justify-center flex-shrink-0">
                  <span class="font-mono text-xs font-bold text-secondary">{{ reply.author.charAt(0).toUpperCase() }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-mono text-sm font-bold text-text-primary">{{ reply.author }}</span>
                    <span class="font-mono text-xs text-text-dim">{{ new Date(reply.createdAt).toLocaleDateString('zh-CN') }}</span>
                  </div>
                  <p class="text-sm text-text-secondary leading-relaxed">{{ reply.content }}</p>
                  <button
                    @click="startReply(reply)"
                    class="mt-2 flex items-center gap-1 text-xs font-mono text-text-dim hover:text-primary transition-colors"
                  >
                    <Reply class="w-3 h-3" />
                    reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card p-8 mb-10 text-center">
      <MessageSquare class="w-10 h-10 text-text-dim mx-auto mb-3" />
      <p class="font-mono text-sm text-text-dim">
        <span class="text-primary">$</span> ls ./comments<br>
        <span class="text-accent">No comments yet. Be the first!</span>
      </p>
    </div>

    <!-- Comment Form -->
    <div id="comment-form" class="card border-primary/10">
      <div class="card-header">
        <div class="card-header-dot" />
        <span class="font-mono text-xs font-bold text-text-secondary uppercase">
          {{ replyTo ? 'reply to ' + replyTo.author : 'leave a comment' }}
        </span>
        <button
          v-if="replyTo"
          @click="cancelReply"
          class="ml-auto text-xs font-mono text-text-dim hover:text-accent transition-colors"
        >
          cancel reply
        </button>
      </div>

      <form @submit.prevent="submitComment" class="p-5 space-y-4">
        <div v-if="error" class="p-3 bg-accent/10 text-accent rounded-lg text-xs font-mono border border-accent/20">
          {{ error }}
        </div>
        <div v-if="success" class="p-3 bg-primary/10 text-primary rounded-lg text-xs font-mono border border-primary/20">
          {{ success }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-1.5">
              <User class="w-3 h-3 inline mr-1" />name <span class="text-accent">*</span>
            </label>
            <input
              v-model="author"
              type="text"
              required
              class="input-geek"
              placeholder="Your name"
            />
          </div>
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-1.5">
              <Mail class="w-3 h-3 inline mr-1" />email
            </label>
            <input
              v-model="email"
              type="email"
              class="input-geek"
              placeholder="not public"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-mono text-text-secondary mb-1.5">
            comment <span class="text-accent">*</span>
          </label>
          <textarea
            v-model="content"
            required
            rows="4"
            class="input-geek resize-none"
            placeholder="Share your thoughts..."
          />
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="btn btn-primary flex items-center gap-2"
            :disabled="submitting"
          >
            <Send class="w-4 h-4" />
            {{ submitting ? 'sending...' : 'send comment' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.comment-card {
  @apply p-5 bg-bg-elevated/50 rounded-xl border border-border-subtle
         hover:border-primary/10 transition-all duration-300;
}
</style>

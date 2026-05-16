<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import CommentSection from '@/components/CommentSection.vue'
import TableOfContents from '@/components/TableOfContents.vue'
import RelatedArticles from '@/components/RelatedArticles.vue'
import ShareButtons from '@/components/ShareButtons.vue'
import { articleApi } from '@/api'
import type { Article } from '@/types'
import { Calendar, Tag, Eye, Clock, Terminal, ChevronLeft, Folder } from 'lucide-vue-next'
import { useMeta } from '@/composables/useMeta'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

declare const hljs: any

const route = useRoute()
const article = ref<Article | null>(null)
const loading = ref(true)
const scrollProgress = ref(0)
const { setArticleMeta } = useMeta()

const loadArticle = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const { data } = await articleApi.getById(id)
    article.value = data.data
  } catch (error) {
    console.error('Failed to load article:', error)
  } finally {
    loading.value = false
  }
}

// Set SEO meta tags
watch(article, (val) => {
  if (val) {
    const summary = val.summary || val.content.replace(/<[^>]*>/g, '').slice(0, 200)
    setArticleMeta(val.title, summary, val.coverImage)
  }
}, { immediate: false })

const handleScroll = () => {
  const docEl = document.documentElement
  const scrollTop = window.scrollY || docEl.scrollTop
  const docHeight = docEl.scrollHeight - window.innerHeight
  scrollProgress.value = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0
}

onMounted(() => {
  loadArticle()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

watch(() => route.params.id, () => {
  loadArticle()
  window.scrollTo(0, 0)
})

watch(article, async () => {
  if (article.value) {
    await nextTick()
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('.geek-prose pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement)
      })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const readTime = (content: string) => {
  const wordsPerMinute = 200
  const wordCount = content.length / 2
  return Math.ceil(wordCount / wordsPerMinute)
}
</script>

<template>
  <DefaultLayout>
    <!-- Reading Progress Bar -->
    <div class="reading-progress" :style="{ width: scrollProgress * 100 + '%' }" />

    <div v-if="loading" class="max-w-4xl mx-auto px-4 py-16">
      <div class="animate-pulse space-y-6">
        <div class="h-8 bg-bg-elevated rounded w-3/4" />
        <div class="h-4 bg-bg-elevated rounded w-1/4" />
        <div class="space-y-3">
          <div class="h-4 bg-bg-elevated rounded" />
          <div class="h-4 bg-bg-elevated rounded" />
          <div class="h-4 bg-bg-elevated rounded w-5/6" />
        </div>
      </div>
    </div>

    <article v-else-if="article" class="max-w-6xl mx-auto px-4 py-12">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-8 text-xs font-mono text-text-dim">
        <router-link to="/" class="hover:text-primary transition-colors">~/home</router-link>
        <span>/</span>
        <span class="text-text-secondary">{{ article.title }}</span>
      </div>

      <!-- Header -->
      <header class="mb-10">
        <div class="flex flex-wrap gap-2 mb-5">
          <router-link
            :to="`/category/${article.category.name}`"
            class="badge badge-primary hover:bg-primary/20 transition-all"
          >
            <Folder class="w-3 h-3 inline mr-1" />
            {{ article.category.name }}
          </router-link>
          <router-link
            v-for="tag in article.tags"
            :key="tag.id"
            :to="`/tag/${tag.name}`"
            class="badge badge-secondary hover:bg-secondary/20 transition-all"
          >
            <Tag class="w-3 h-3 inline mr-1" />
            {{ tag.name }}
          </router-link>
        </div>

        <h1 class="font-display text-3xl md:text-5xl font-bold text-text-primary mb-6 leading-tight">
          {{ article.title }}
        </h1>

        <div class="flex flex-wrap gap-6 text-sm text-text-dim font-mono">
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4 text-primary" />
            <span>{{ new Date(article.createdAt).toLocaleDateString('zh-CN') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-secondary" />
            <span>{{ readTime(article.content) }} min read</span>
          </div>
          <div class="flex items-center gap-2">
            <Eye class="w-4 h-4 text-accent" />
            <span>{{ article.viewCount }} views</span>
          </div>
        </div>
      </header>

      <div class="flex gap-10">
        <!-- Main Content -->
        <div class="flex-1 min-w-0 max-w-4xl">
          <!-- Cover Image -->
          <div v-if="article.coverImage" class="mb-10 rounded-xl overflow-hidden border border-border-subtle">
            <img
              :src="article.coverImage"
              :alt="article.title"
              class="w-full aspect-video object-cover"
            />
          </div>

          <!-- Divider -->
          <div class="flex items-center gap-3 mb-10">
            <div class="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            <Terminal class="w-4 h-4 text-primary" />
            <div class="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
          </div>

          <!-- Content -->
          <div class="geek-prose mb-16">
            <div v-html="DOMPurify.sanitize(marked(article.content, { async: false }))" />
          </div>

          <!-- Footer -->
          <footer class="border-t border-border-subtle pt-8">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div class="flex items-center gap-2 text-text-dim font-mono text-sm">
                <Tag class="w-4 h-4 text-secondary" />
                <span>tags:</span>
                <router-link
                  v-for="tag in article.tags"
                  :key="tag.id"
                  :to="`/tag/${tag.name}`"
                  class="badge badge-dim hover:border-secondary/50 transition-all"
                >
                  {{ tag.name }}
                </router-link>
              </div>
              <ShareButtons :title="article.title" />
            </div>
          </footer>

          <!-- Related Articles -->
          <RelatedArticles :article-id="article.id" />

          <!-- Comments -->
          <CommentSection :article-id="article.id" />
        </div>

        <!-- TOC Sidebar -->
        <aside class="hidden xl:block w-64 flex-shrink-0">
          <div class="sticky top-20">
            <TableOfContents :content="article.content" />
          </div>
        </aside>
      </div>
    </article>

    <div v-else class="max-w-4xl mx-auto px-4 py-16 text-center">
      <div class="card p-12">
        <Terminal class="w-12 h-12 text-text-dim mx-auto mb-4" />
        <p class="font-mono text-text-dim">
          <span class="text-accent">Error 404:</span> article not found
        </p>
        <router-link to="/" class="btn btn-primary mt-6 inline-flex">
          <ChevronLeft class="w-4 h-4 mr-1" /> go home
        </router-link>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.geek-prose :deep(h1) {
  @apply font-display text-2xl font-bold text-text-primary mt-8 mb-4;
}

.geek-prose :deep(h2) {
  @apply font-display text-xl font-bold text-text-primary mt-6 mb-3;
}

.geek-prose :deep(h3) {
  @apply font-display text-lg font-bold text-text-primary mt-4 mb-2;
}

.geek-prose :deep(p) {
  @apply mb-4 leading-relaxed text-text-secondary text-sm;
}

.geek-prose :deep(code) {
  @apply bg-bg-dark px-2 py-1 rounded text-xs font-mono text-primary border border-border-subtle;
}

.geek-prose :deep(pre) {
  @apply bg-[#282c34] text-text-primary p-5 rounded-xl overflow-x-auto my-6 border border-border-subtle relative;
}

.geek-prose :deep(pre code) {
  @apply bg-transparent p-0 text-text-primary border-0 text-sm leading-relaxed;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* highlight.js overrides for atom-one-dark in geek-prose */
.geek-prose :deep(pre .hljs) {
  @apply bg-transparent p-0;
}

.geek-prose :deep(pre code .hljs-keyword) { color: #c678dd; }
.geek-prose :deep(pre code .hljs-string) { color: #98c379; }
.geek-prose :deep(pre code .hljs-number) { color: #d19a66; }
.geek-prose :deep(pre code .hljs-function) { color: #61afef; }
.geek-prose :deep(pre code .hljs-title) { color: #61afef; }
.geek-prose :deep(pre code .hljs-comment) { color: #5c6370; font-style: italic; }
.geek-prose :deep(pre code .hljs-attr) { color: #d19a66; }
.geek-prose :deep(pre code .hljs-built_in) { color: #c678dd; }
.geek-prose :deep(pre code .hljs-literal) { color: #56b6c2; }
.geek-prose :deep(pre code .hljs-type) { color: #e5c07b; }
.geek-prose :deep(pre code .hljs-params) { color: #e5c07b; }
.geek-prose :deep(pre code .hljs-attribute) { color: #e06c75; }
.geek-prose :deep(pre code .hljs-selector-class) { color: #e5c07b; }
.geek-prose :deep(pre code .hljs-selector-tag) { color: #e06c75; }
.geek-prose :deep(pre code .hljs-meta) { color: #61afef; }
.geek-prose :deep(pre code .hljs-tag) { color: #e06c75; }
.geek-prose :deep(pre code .hljs-name) { color: #e06c75; }

.geek-prose :deep(blockquote) {
  @apply border-l-2 border-primary/50 pl-5 text-text-dim italic my-6;
}

.geek-prose :deep(img) {
  @apply rounded-xl my-6 max-w-full border border-border-subtle;
}

.geek-prose :deep(ul) {
  @apply list-disc pl-6 mb-4 text-text-secondary;
}

.geek-prose :deep(ol) {
  @apply list-decimal pl-6 mb-4 text-text-secondary;
}

.geek-prose :deep(li) {
  @apply mb-2 text-sm;
}

.geek-prose :deep(a) {
  @apply text-primary underline decoration-primary/30 underline-offset-2;
}

.geek-prose :deep(hr) {
  @apply border-border-subtle my-8;
}

.geek-prose :deep(table) {
  @apply w-full border-collapse my-6 text-sm;
}

.reading-progress {
  @apply fixed top-0 left-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent z-[100] transition-all duration-150;
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.4);
}

.geek-prose :deep(th) {
  @apply bg-bg-elevated px-4 py-3 text-left font-mono text-xs text-text-secondary uppercase border-b border-border-subtle;
}

.geek-prose :deep(td) {
  @apply px-4 py-3 border-b border-border-subtle text-text-secondary;
}
</style>

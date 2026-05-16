<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ListTree } from 'lucide-vue-next'

interface TocItem {
  id: string
  text: string
  level: number
}

const props = defineProps<{
  content: string
}>()

const headings = ref<TocItem[]>([])
const activeId = ref('')
const observer = ref<IntersectionObserver | null>(null)

const generateId = (text: string, index: number): string => {
  return `heading-${index}-${text.toLowerCase().replace(/[^\w一-鿿]+/g, '-').replace(/(^-|-$)/g, '')}`
}

const extractHeadings = () => {
  const items: TocItem[] = []
  const hRegex = /<h([1-3])(\s[^>]*)?>(.*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  let index = 0

  while ((match = hRegex.exec(props.content)) !== null) {
    const level = parseInt(match[1])
    const text = match[3].replace(/<[^>]*>/g, '').trim()
    if (text) {
      items.push({ id: generateId(text, index), text, level })
      index++
    }
  }

  headings.value = items
}

const scrollToHeading = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    const offset = 100
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

const setupObserver = () => {
  if (observer.value) observer.value.disconnect()

  observer.value = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id
        }
      }
    },
    { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
  )

  // Observe headings after DOM render
  setTimeout(() => {
    for (const h of headings.value) {
      const el = document.getElementById(h.id)
      if (el) observer.value?.observe(el)
    }
  }, 100)
}

const injectHeadingIds = () => {
  // Add IDs to heading elements after render
  const article = document.querySelector('.geek-prose')
  if (!article) return

  let index = 0
  const headingTags = ['H1', 'H2', 'H3']
  for (const el of article.querySelectorAll('h1, h2, h3')) {
    if (headingTags.includes(el.tagName)) {
      const id = generateId(el.textContent || '', index)
      el.id = id
      index++
    }
  }
}

onMounted(() => {
  extractHeadings()
  // Wait for DOM to render, then inject IDs and observe
  setTimeout(() => {
    injectHeadingIds()
    setupObserver()
  }, 200)
})

onUnmounted(() => {
  observer.value?.disconnect()
})

watch(() => props.content, () => {
  extractHeadings()
  setTimeout(() => {
    injectHeadingIds()
    setupObserver()
  }, 200)
})
</script>

<template>
  <div v-if="headings.length > 0" class="toc">
    <div class="flex items-center gap-2 mb-4">
      <ListTree class="w-4 h-4 text-primary" />
      <span class="font-mono text-xs font-bold text-text-secondary uppercase tracking-wider">contents</span>
    </div>
    <nav class="space-y-0.5">
      <button
        v-for="h in headings"
        :key="h.id"
        @click="scrollToHeading(h.id)"
        class="toc-link"
        :class="[
          activeId === h.id ? 'toc-link-active' : 'toc-link-inactive',
          h.level === 1 ? 'pl-0' : h.level === 2 ? 'pl-4' : 'pl-8',
        ]"
      >
        <span class="toc-dot" :class="activeId === h.id ? 'toc-dot-active' : 'toc-dot-inactive'" />
        <span class="truncate">{{ h.text }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.toc {
  @apply p-4 rounded-xl border border-border-subtle bg-bg-elevated/50;
}

.toc-link {
  @apply w-full flex items-center gap-2 py-1.5 text-left text-xs font-mono transition-all duration-200 rounded;
}

.toc-link-inactive {
  @apply text-text-dim hover:text-text-primary;
}

.toc-link-active {
  @apply text-primary;
}

.toc-dot {
  @apply w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200;
}

.toc-dot-inactive {
  @apply bg-border-subtle;
}

.toc-dot-active {
  @apply bg-primary shadow-glow;
}
</style>

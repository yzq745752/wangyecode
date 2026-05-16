<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Save, Eye, Edit3, Terminal, Folder, Tag as TagIcon, Image, Upload } from 'lucide-vue-next'
import apiClient from '@/api/client'
import { articleApi, categoryApi, tagApi } from '@/api'
import type { Category, Tag } from '@/types'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const route = useRoute()
const router = useRouter()

const title = ref('')
const content = ref('')
const summary = ref('')
const coverImage = ref('')
const categoryId = ref<number | null>(null)
const selectedTags = ref<number[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const loading = ref(false)
const isPreview = ref(false)
const coverUploading = ref(false)
const contentUploading = ref(false)

const articleId = computed(() => {
  const id = route.params.id as string
  return id ? Number(id) : null
})

const isEdit = computed(() => articleId.value !== null)

const renderedContent = computed(() => {
  return DOMPurify.sanitize(marked(content.value, { async: false }))
})

const loadCategories = async () => {
  try {
    const { data } = await categoryApi.getAll()
    categories.value = data.data
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const loadTags = async () => {
  try {
    const { data } = await tagApi.getAll()
    tags.value = data.data
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

const loadArticle = async () => {
  if (!articleId.value) return
  try {
    const { data } = await articleApi.getById(articleId.value)
    const article = data.data
    title.value = article.title
    content.value = article.content
    summary.value = article.summary
    coverImage.value = article.coverImage || ''
    categoryId.value = article.categoryId
    selectedTags.value = article.tags.map(t => t.id)
  } catch (error) {
    console.error('Failed to load article:', error)
  }
}

const handleSubmit = async () => {
  if (!title.value || !content.value || !categoryId.value) {
    toast.error('请填写标题、内容和分类')
    return
  }

  loading.value = true
  try {
    const data = {
      title: title.value,
      content: content.value,
      summary: summary.value || content.value.slice(0, 200),
      coverImage: coverImage.value || null,
      categoryId: categoryId.value,
      tagIds: selectedTags.value,
    }

    if (isEdit.value) {
      await articleApi.update(articleId.value!, data)
    } else {
      await articleApi.create(data)
    }

    router.push('/admin/articles')
    toast.success('文章保存成功')
  } catch (error) {
    console.error('Failed to save article:', error)
    toast.error('保存失败，请重试')
  } finally {
    loading.value = false
  }
}

const toggleTag = (tagId: number) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

const uploadCoverImage = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverUploading.value = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await apiClient.post('/api/upload', formData)
    coverImage.value = data.url
  } catch {
    alert('封面图片上传失败')
  } finally {
    coverUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

const uploadContentImage = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  contentUploading.value = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await apiClient.post('/api/upload', formData)
    content.value += `\n![${file.name}](${data.url})\n`
  } catch {
    alert('图片上传失败')
  } finally {
    contentUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadTags()])
  await loadArticle()
})
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-2">
        <Terminal class="w-4 h-4 text-primary" />
        <h1 class="font-mono text-xl font-bold text-text-primary">
          {{ isEdit ? 'edit-article' : 'new-article' }}
        </h1>
      </div>
      <button
        @click="handleSubmit"
        class="btn btn-primary flex items-center gap-2"
        :disabled="loading"
      >
        <Save class="w-4 h-4" />
        {{ loading ? 'saving...' : 'save' }}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Editor -->
      <div class="space-y-6">
        <div class="card">
          <div class="card-header">
            <div class="card-header-dot" />
            <span class="font-mono text-xs font-bold text-text-secondary uppercase">metadata</span>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-mono text-text-secondary mb-2">title <span class="text-accent">*</span></label>
              <input
                v-model="title"
                type="text"
                required
                class="input-geek"
                placeholder="Enter article title..."
              />
            </div>

            <div>
              <label class="block text-xs font-mono text-text-secondary mb-2">
                <Folder class="w-3 h-3 inline mr-1" />category <span class="text-accent">*</span>
              </label>
              <select
                v-model="categoryId"
                required
                class="input-geek"
              >
                <option :value="null">Select category...</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-mono text-text-secondary mb-2">
                <TagIcon class="w-3 h-3 inline mr-1" />tags
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tag in tags"
                  :key="tag.id"
                  @click="toggleTag(tag.id)"
                  :class="[
                    'badge transition-all cursor-pointer',
                    selectedTags.includes(tag.id)
                      ? 'badge-primary shadow-glow'
                      : 'badge-dim'
                  ]"
                >
                  {{ tag.name }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-mono text-text-secondary mb-2">cover image</label>
              <div class="flex gap-2">
                <input
                  v-model="coverImage"
                  type="text"
                  class="input-geek flex-1"
                  placeholder="https://example.com/image.jpg"
                />
                <label class="btn btn-secondary cursor-pointer flex items-center gap-1.5 text-xs !px-3">
                  <Upload class="w-3.5 h-3.5" />
                  <span>{{ coverUploading ? '...' : 'upload' }}</span>
                  <input type="file" accept="image/*" class="hidden" @change="uploadCoverImage" />
                </label>
              </div>
            </div>

            <div>
              <label class="block text-xs font-mono text-text-secondary mb-2">summary</label>
              <textarea
                v-model="summary"
                rows="3"
                class="input-geek resize-none"
                placeholder="Auto-generated if empty..."
              />
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-header-dot" />
            <span class="font-mono text-xs font-bold text-text-secondary uppercase">content</span>
            <div class="ml-auto flex items-center gap-2">
              <label class="flex items-center gap-1.5 text-xs text-text-dim hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-bg-hover cursor-pointer">
                <Image class="w-3.5 h-3.5" />
                <span>{{ contentUploading ? '...' : 'image' }}</span>
                <input type="file" accept="image/*" class="hidden" @change="uploadContentImage" />
              </label>
              <button
                @click="isPreview = !isPreview"
                class="flex items-center gap-1.5 text-xs text-text-dim hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-bg-hover"
              >
                <component :is="isPreview ? Edit3 : Eye" class="w-3.5 h-3.5" />
                {{ isPreview ? 'edit' : 'preview' }}
              </button>
            </div>
          </div>

          <div class="p-5">
            <textarea
              v-if="!isPreview"
              v-model="content"
              rows="20"
              required
              class="input-geek resize-none"
              placeholder="# Write your article here..."
            />

            <div
              v-else
              class="prose max-w-none p-4 bg-bg-elevated rounded-lg min-h-[500px] max-h-[500px] overflow-y-auto border border-border-subtle"
              v-html="renderedContent"
            />
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="hidden lg:block">
        <div class="card sticky top-6">
          <div class="card-header">
            <div class="card-header-dot" />
            <span class="font-mono text-xs font-bold text-text-secondary uppercase">live_preview</span>
          </div>
          <div class="p-5 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div v-if="title" class="mb-6">
              <h1 class="text-2xl font-bold text-text-primary mb-3 font-display">{{ title }}</h1>
              <div class="flex gap-2 flex-wrap">
                <span v-if="categoryId" class="badge badge-primary text-xs">
                  {{ categories.find(c => c.id === categoryId)?.name }}
                </span>
                <span
                  v-for="tagId in selectedTags"
                  :key="tagId"
                  class="badge badge-dim text-xs"
                >
                  {{ tags.find(t => t.id === tagId)?.name }}
                </span>
              </div>
            </div>
            <div v-html="renderedContent" class="geek-prose" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.geek-prose :deep(h1) {
  @apply font-display text-2xl font-bold text-text-primary mt-6 mb-3;
}

.geek-prose :deep(h2) {
  @apply font-display text-xl font-bold text-text-primary mt-5 mb-2;
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
  @apply bg-bg-dark text-text-primary p-4 rounded-lg overflow-x-auto my-4 border border-border-subtle;
}

.geek-prose :deep(pre code) {
  @apply bg-transparent p-0 text-text-primary border-0;
}

.geek-prose :deep(blockquote) {
  @apply border-l-2 border-primary/50 pl-4 text-text-dim italic my-4;
}

.geek-prose :deep(img) {
  @apply rounded-lg my-4 max-w-full border border-border-subtle;
}

.geek-prose :deep(ul) {
  @apply list-disc pl-5 mb-4 text-text-secondary;
}

.geek-prose :deep(ol) {
  @apply list-decimal pl-5 mb-4 text-text-secondary;
}

.geek-prose :deep(li) {
  @apply mb-1.5 text-sm;
}

.geek-prose :deep(a) {
  @apply text-primary underline decoration-primary/30 underline-offset-2;
}

.geek-prose :deep(hr) {
  @apply border-border-subtle my-6;
}

.geek-prose :deep(table) {
  @apply w-full border-collapse my-4 text-sm;
}

.geek-prose :deep(th) {
  @apply bg-bg-elevated px-3 py-2 text-left font-mono text-xs text-text-secondary uppercase border-b border-border-subtle;
}

.geek-prose :deep(td) {
  @apply px-3 py-2 border-b border-border-subtle text-text-secondary;
}
</style>

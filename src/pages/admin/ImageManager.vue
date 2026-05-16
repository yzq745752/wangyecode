<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Image, Upload, Trash2, Link, Check } from 'lucide-vue-next'
import { imageApi } from '@/api'
import type { ImageItem } from '@/api'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const images = ref<ImageItem[]>([])
const loading = ref(true)
const uploading = ref(false)
const copiedUrl = ref<string | null>(null)

const loadImages = async () => {
  loading.value = true
  try {
    const { data } = await imageApi.getAll()
    images.value = data.data
  } catch (e) {
    toast.error('加载图片失败')
  } finally {
    loading.value = false
  }
}

const handleUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return

  uploading.value = true
  try {
    await imageApi.upload(input.files[0])
    toast.success('上传成功')
    loadImages()
  } catch (e: any) {
    toast.error(e.response?.data?.message || '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const handleDelete = async (filename: string) => {
  if (!window.confirm(`确定要删除 ${filename} 吗？`)) return
  try {
    await imageApi.delete(filename)
    images.value = images.value.filter(i => i.filename !== filename)
    toast.success('已删除')
  } catch (e) {
    toast.error('删除失败')
  }
}

const copyUrl = (url: string) => {
  const fullUrl = window.location.origin + url
  navigator.clipboard.writeText(fullUrl).then(() => {
    copiedUrl.value = url
    setTimeout(() => { copiedUrl.value = null }, 2000)
  }).catch(() => {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = fullUrl
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copiedUrl.value = url
    setTimeout(() => { copiedUrl.value = null }, 2000)
  })
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(loadImages)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <Image class="w-4 h-4 text-primary" />
        <h1 class="font-mono text-xl font-bold text-text-primary">image_manager</h1>
      </div>
      <label class="btn btn-primary cursor-pointer flex items-center gap-2">
        <Upload class="w-4 h-4" />
        <span>{{ uploading ? 'uploading...' : 'upload' }}</span>
        <input type="file" accept="image/*" class="hidden" @change="handleUpload" :disabled="uploading" />
      </label>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div v-for="i in 12" :key="i" class="card animate-pulse">
        <div class="aspect-square bg-bg-elevated" />
        <div class="p-3 space-y-2">
          <div class="h-3 bg-bg-elevated rounded w-3/4" />
          <div class="h-2 bg-bg-elevated rounded w-1/2" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="images.length === 0" class="card p-12 text-center">
      <Image class="w-12 h-12 text-text-dim mx-auto mb-4" />
      <p class="font-mono text-text-dim mb-2">
        <span class="text-primary">$</span> ls ./uploads
      </p>
      <p class="font-mono text-sm text-text-dim">
        <span class="text-accent">No images found.</span> Upload your first image.
      </p>
    </div>

    <!-- Image grid -->
    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div
        v-for="img in images"
        :key="img.filename"
        class="card group relative overflow-hidden"
      >
        <div class="aspect-square bg-bg-elevated overflow-hidden">
          <img
            :src="img.url"
            :alt="img.filename"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <!-- Overlay actions -->
        <div class="absolute inset-0 bg-bg-dark/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            @click="copyUrl(img.url)"
            class="p-2 rounded-lg bg-bg-elevated/80 hover:bg-primary/20 text-text-secondary hover:text-primary transition-all"
            :title="copiedUrl === img.url ? 'Copied!' : 'Copy URL'"
          >
            <Check v-if="copiedUrl === img.url" class="w-4 h-4" />
            <Link v-else class="w-4 h-4" />
          </button>
          <button
            @click="handleDelete(img.filename)"
            class="p-2 rounded-lg bg-bg-elevated/80 hover:bg-accent/20 text-text-secondary hover:text-accent transition-all"
            title="Delete"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <div class="p-3">
          <p class="font-mono text-xs text-text-secondary truncate">{{ img.filename }}</p>
          <p class="font-mono text-xs text-text-dim mt-1">{{ formatSize(img.size) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Save, User, Mail, Github, Heart, Code2 } from 'lucide-vue-next'
import apiClient from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const form = ref({
  name: '',
  role: '',
  passion: '',
  bio: '',
  philosophy: '',
  email: '',
  github: '',
})
const loading = ref(true)
const saving = ref(false)

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/api/config/about')
    if (data.data) {
      form.value = { ...form.value, ...data.data }
    }
  } catch (e) {
    console.error('Failed to load about config:', e)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  saving.value = true
  try {
    await apiClient.put('/api/config/about', form.value)
    toast.success('关于页已更新')
  } catch (e) {
    console.error('Failed to save:', e)
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <User class="w-4 h-4 text-primary" />
      <h1 class="font-mono text-xl font-bold text-text-primary">about_page</h1>
    </div>

    <div v-if="loading" class="card p-8">
      <div class="animate-pulse space-y-4">
        <div v-for="i in 6" :key="i" class="h-12 bg-bg-elevated rounded" />
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="max-w-2xl space-y-6">
      <div class="card">
        <div class="card-header">
          <div class="card-header-dot" />
          <span class="font-mono text-xs font-bold text-text-secondary uppercase">profile</span>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">name</label>
            <input v-model="form.name" type="text" class="input-geek" />
          </div>
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">role</label>
            <input v-model="form.role" type="text" class="input-geek" />
          </div>
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">passion</label>
            <input v-model="form.passion" type="text" class="input-geek" />
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-dot" />
          <span class="font-mono text-xs font-bold text-text-secondary uppercase">content</span>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">
              <Heart class="w-3 h-3 inline mr-1" />bio
            </label>
            <textarea v-model="form.bio" rows="4" class="input-geek resize-none" />
          </div>
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">
              <Code2 class="w-3 h-3 inline mr-1" />philosophy
            </label>
            <textarea v-model="form.philosophy" rows="3" class="input-geek resize-none" />
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-dot" />
          <span class="font-mono text-xs font-bold text-text-secondary uppercase">contact</span>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">
              <Mail class="w-3 h-3 inline mr-1" />email
            </label>
            <input v-model="form.email" type="email" class="input-geek" />
          </div>
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">
              <Github class="w-3 h-3 inline mr-1" />github
            </label>
            <input v-model="form.github" type="url" class="input-geek" />
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <button type="submit" class="btn btn-primary flex items-center gap-2" :disabled="saving">
          <Save class="w-4 h-4" />
          {{ saving ? 'saving...' : 'save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Edit, Trash2, Tag as TagIcon, Terminal } from 'lucide-vue-next'
import { tagApi } from '@/api'
import type { Tag } from '@/types'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const tags = ref<Tag[]>([])
const loading = ref(true)
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const formName = ref('')

const loadTags = async () => {
  loading.value = true
  try {
    const { data } = await tagApi.getAll()
    tags.value = data.data
  } catch (error) {
    console.error('Failed to load tags:', error)
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  formName.value = ''
  showDialog.value = true
}

const openEdit = (tag: Tag) => {
  editingId.value = tag.id
  formName.value = tag.name
  showDialog.value = true
}

const handleSubmit = async () => {
  if (!formName.value.trim()) return
  try {
    if (editingId.value) {
      await tagApi.update(editingId.value, { name: formName.value })
      toast.success('标签已更新')
    } else {
      await tagApi.create({ name: formName.value })
      toast.success('标签已创建')
    }
    showDialog.value = false
    await loadTags()
  } catch (error) {
    console.error('Failed to save tag:', error)
    toast.error('保存失败，可能名称已存在')
  }
}

const handleDelete = async (id: number) => {
  if (!window.confirm('确定删除此标签？')) return
  try {
    await tagApi.delete(id)
    await loadTags()
    toast.success('标签已删除')
  } catch (error) {
    console.error('Failed to delete tag:', error)
    toast.error('删除失败')
  }
}

onMounted(loadTags)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-2">
        <TagIcon class="w-4 h-4 text-secondary" />
        <h1 class="font-mono text-xl font-bold text-text-primary">tags</h1>
      </div>
      <button @click="openCreate" class="btn btn-secondary flex items-center gap-2">
        <Plus class="w-4 h-4" />
        new
      </button>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-8">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 5" :key="i" class="h-12 bg-bg-elevated rounded" />
        </div>
      </div>

      <div v-else-if="tags.length > 0">
        <table class="w-full">
          <thead class="bg-bg-elevated/50 border-b border-border-subtle">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">name</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">articles</th>
              <th class="px-5 py-3 text-left text-xs font-mono font-medium text-text-dim uppercase tracking-wider">created</th>
              <th class="px-5 py-3 text-right text-xs font-mono font-medium text-text-dim uppercase tracking-wider">actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="tag in tags" :key="tag.id" class="hover:bg-bg-hover/50 transition-colors">
              <td class="px-5 py-3">
                <span class="font-mono text-sm text-text-primary">
                  <span class="text-secondary">#</span>{{ tag.name }}
                </span>
              </td>
              <td class="px-5 py-3 text-xs text-text-dim font-mono">{{ tag.articleCount || 0 }}</td>
              <td class="px-5 py-3 text-xs text-text-dim font-mono">
                {{ new Date(tag.createdAt!).toLocaleDateString('zh-CN') }}
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex justify-end gap-1">
                  <button
                    @click="openEdit(tag)"
                    class="p-1.5 text-text-dim hover:text-secondary transition-colors"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDelete(tag.id)"
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
          <span class="text-secondary">$</span> ls ./tags<br>
          <span class="text-accent">No tags found.</span>
        </p>
        <button @click="openCreate" class="btn btn-secondary">
          create first tag
        </button>
      </div>
    </div>

    <!-- Dialog -->
    <div v-if="showDialog" class="fixed inset-0 bg-bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div class="card w-full max-w-md shadow-glow-secondary animate-fade-in-up">
        <div class="card-header">
          <div class="card-header-dot" style="background-color: #b19cd9;" />
          <span class="font-mono text-xs font-bold text-text-secondary uppercase">
            {{ editingId ? 'edit' : 'new' }}_tag
          </span>
        </div>
        <div class="p-5">
          <form @submit.prevent="handleSubmit">
            <label class="block text-xs font-mono text-text-secondary mb-2">name</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-mono text-sm">#</span>
              <input
                v-model="formName"
                type="text"
                required
                class="input-geek pl-8"
                placeholder="Enter tag name..."
              />
            </div>
            <div class="flex justify-end gap-3 mt-5">
              <button
                type="button"
                @click="showDialog = false"
                class="btn btn-ghost"
              >
                cancel
              </button>
              <button type="submit" class="btn btn-secondary">
                save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

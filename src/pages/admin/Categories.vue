<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Edit, Trash2, Folder, Terminal } from 'lucide-vue-next'
import { categoryApi } from '@/api'
import type { Category } from '@/types'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const categories = ref<Category[]>([])
const loading = ref(true)
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const formName = ref('')

const loadCategories = async () => {
  loading.value = true
  try {
    const { data } = await categoryApi.getAll()
    categories.value = data.data
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  formName.value = ''
  showDialog.value = true
}

const openEdit = (category: Category) => {
  editingId.value = category.id
  formName.value = category.name
  showDialog.value = true
}

const handleSubmit = async () => {
  if (!formName.value.trim()) return
  try {
    if (editingId.value) {
      await categoryApi.update(editingId.value, { name: formName.value })
      toast.success('分类已更新')
    } else {
      await categoryApi.create({ name: formName.value })
      toast.success('分类已创建')
    }
    showDialog.value = false
    await loadCategories()
  } catch (error) {
    console.error('Failed to save category:', error)
    toast.error('保存失败，可能名称已存在')
  }
}

const handleDelete = async (id: number) => {
  if (!window.confirm('确定删除此分类？')) return
  try {
    await categoryApi.delete(id)
    await loadCategories()
    toast.success('分类已删除')
  } catch (error) {
    console.error('Failed to delete category:', error)
    toast.error('删除失败，请检查是否有文章使用此分类')
  }
}

onMounted(loadCategories)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-2">
        <Folder class="w-4 h-4 text-primary" />
        <h1 class="font-mono text-xl font-bold text-text-primary">categories</h1>
      </div>
      <button @click="openCreate" class="btn btn-primary flex items-center gap-2">
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

      <div v-else-if="categories.length > 0">
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
            <tr v-for="category in categories" :key="category.id" class="hover:bg-bg-hover/50 transition-colors">
              <td class="px-5 py-3 font-mono text-sm text-text-primary">{{ category.name }}</td>
              <td class="px-5 py-3 text-xs text-text-dim font-mono">{{ category.articleCount || 0 }}</td>
              <td class="px-5 py-3 text-xs text-text-dim font-mono">
                {{ new Date(category.createdAt!).toLocaleDateString('zh-CN') }}
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex justify-end gap-1">
                  <button
                    @click="openEdit(category)"
                    class="p-1.5 text-text-dim hover:text-secondary transition-colors"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDelete(category.id)"
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
          <span class="text-primary">$</span> ls ./categories<br>
          <span class="text-accent">No categories found.</span>
        </p>
        <button @click="openCreate" class="btn btn-primary">
          create first category
        </button>
      </div>
    </div>

    <!-- Dialog -->
    <div v-if="showDialog" class="fixed inset-0 bg-bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div class="card w-full max-w-md shadow-glow animate-fade-in-up">
        <div class="card-header">
          <div class="card-header-dot" />
          <span class="font-mono text-xs font-bold text-text-secondary uppercase">
            {{ editingId ? 'edit' : 'new' }}_category
          </span>
        </div>
        <div class="p-5">
          <form @submit.prevent="handleSubmit">
            <label class="block text-xs font-mono text-text-secondary mb-2">name</label>
            <input
              v-model="formName"
              type="text"
              required
              class="input-geek"
              placeholder="Enter category name..."
            />
            <div class="flex justify-end gap-3 mt-5">
              <button
                type="button"
                @click="showDialog = false"
                class="btn btn-ghost"
              >
                cancel
              </button>
              <button type="submit" class="btn btn-primary">
                save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

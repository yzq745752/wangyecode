<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-vue-next'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const loading = ref(false)

const handleSubmit = async () => {
  if (!currentPassword.value || !newPassword.value) {
    toast.error('请填写所有字段')
    return
  }
  if (newPassword.value.length < 6) {
    toast.error('新密码至少6位')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error('两次密码输入不一致')
    return
  }

  loading.value = true
  try {
    await apiClient.put('/api/auth/password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    toast.success('密码修改成功，请重新登录')
    setTimeout(() => {
      authStore.logout()
      router.push('/admin/login')
    }, 1500)
  } catch (e: any) {
    toast.error(e.response?.data?.message || '密码修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <KeyRound class="w-4 h-4 text-primary" />
      <h1 class="font-mono text-xl font-bold text-text-primary">change_password</h1>
    </div>

    <div class="max-w-md">
      <div class="card">
        <div class="card-header">
          <div class="card-header-dot" />
          <span class="font-mono text-xs font-bold text-text-secondary uppercase">security</span>
        </div>

        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">current password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                v-model="currentPassword"
                :type="showCurrent ? 'text' : 'password'"
                required
                class="input-geek pl-10 pr-10"
              />
              <button type="button" @click="showCurrent = !showCurrent" class="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-primary">
                <Eye v-if="!showCurrent" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">new password</label>
            <div class="relative">
              <KeyRound class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                v-model="newPassword"
                :type="showNew ? 'text' : 'password'"
                required
                minlength="6"
                class="input-geek pl-10 pr-10"
              />
              <button type="button" @click="showNew = !showNew" class="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-primary">
                <Eye v-if="!showNew" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">confirm new password</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              minlength="6"
              class="input-geek"
            />
          </div>

          <button type="submit" class="w-full btn btn-primary py-2.5 font-mono text-sm" :disabled="loading">
            <span class="text-primary">$</span> {{ loading ? 'changing...' : 'change password' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

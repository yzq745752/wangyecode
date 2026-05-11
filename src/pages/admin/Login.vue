<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Lock, User, Terminal, Eye, EyeOff } from 'lucide-vue-next'
import MatrixRain from '@/components/MatrixRain.vue'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(username.value, password.value)
    router.push('/admin/dashboard')
  } catch {
    error.value = 'access denied: invalid credentials'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg-dark flex items-center justify-center p-4 bg-grid-pattern relative overflow-hidden">
    <MatrixRain />
    <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
    
    <div class="relative w-full max-w-md animate-fade-in-up z-10">
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 mb-4">
          <Terminal class="w-6 h-6 text-primary animate-flicker" />
          <h1 class="font-mono text-2xl font-bold">
            <span class="text-primary">~/</span><span class="text-text-primary">admin</span>
          </h1>
        </div>
        <p class="font-mono text-xs text-text-dim">
          <span class="text-accent">sudo</span> authentication required
        </p>
      </div>

      <div class="card p-6 shadow-glow">
        <div class="card-header mb-4">
          <div class="card-header-dot" />
          <span class="font-mono text-xs font-bold text-text-secondary">login_session</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div v-if="error" class="p-3 bg-accent/10 text-accent rounded-lg text-xs font-mono border border-accent/20 animate-fade-in">
            {{ error }}
          </div>

          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">username</label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                v-model="username"
                type="text"
                required
                class="input-geek pl-10"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-secondary mb-2">password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="input-geek pl-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-primary transition-colors"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="w-full btn btn-primary py-3 font-mono text-sm"
            :disabled="loading"
          >
            <span class="text-primary">$</span> {{ loading ? 'authenticating...' : 'authenticate' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, LogIn, Menu, X, Terminal, Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { theme, toggle: toggleTheme } = useTheme()

const router = useRouter()
const isMenuOpen = ref(false)
const showSearch = ref(false)
const showLogin = ref(false)
const searchQuery = ref('')
const username = ref('')
const password = ref('')
const loginError = ref('')
const loginLoading = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    showSearch.value = false
    showLogin.value = false
  }
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
    showSearch.value = false
    searchQuery.value = ''
  }
}

const handleLogin = async () => {
  loginError.value = ''
  loginLoading.value = true
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    const data = await response.json()
    if (!response.ok) {
      loginError.value = data.message || '登录失败'
      return
    }
    localStorage.setItem('token', data.token)
    showLogin.value = false
    username.value = ''
    password.value = ''
    router.push('/admin/dashboard')
  } catch {
    loginError.value = '网络错误，请重试'
  } finally {
    loginLoading.value = false
  }
}

const closeAllPanels = () => {
  showSearch.value = false
  isMenuOpen.value = false
  showLogin.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeAllPanels()
  }
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('nav')) {
    closeAllPanels()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
})

const navLinks = [
  { name: '~/home', path: '/' },
  { name: '~/archive', path: '/archive' },
  { name: '~/about', path: '/about' },
]
</script>

<template>
  <nav class="bg-bg-dark/80 backdrop-blur-xl border-b border-border-subtle sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-14">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 group">
            <Terminal class="w-5 h-5 text-primary group-hover:animate-flicker transition-all" />
            <span class="font-mono text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
              <span class="text-primary">~/</span>blog
            </span>
          </router-link>
        </div>

        <div class="hidden md:flex items-center space-x-1">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="px-3 py-1.5 font-mono text-sm text-text-secondary hover:text-primary transition-colors rounded-md hover:bg-bg-hover"
          >
            {{ link.name }}
          </router-link>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click.stop="toggleTheme"
            class="p-2 text-text-secondary hover:text-primary transition-all rounded-md hover:bg-bg-hover"
            :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          >
            <Sun v-if="theme === 'dark'" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>

          <button
            @click.stop="showSearch = !showSearch; isMenuOpen = false; showLogin = false"
            class="p-2 text-text-secondary hover:text-primary transition-all rounded-md hover:bg-bg-hover"
            :class="{ 'text-primary bg-primary/10': showSearch }"
          >
            <Search class="w-4 h-4" />
          </button>

          <button
            @click.stop="showLogin = !showLogin; showSearch = false; isMenuOpen = false"
            class="p-2 text-text-secondary hover:text-primary transition-all rounded-md hover:bg-bg-hover"
            :class="{ 'text-primary bg-primary/10': showLogin }"
          >
            <LogIn class="w-4 h-4" />
          </button>

          <button
            @click.stop="toggleMenu"
            class="md:hidden p-2 text-text-secondary hover:text-primary transition-all rounded-md hover:bg-bg-hover"
          >
            <Menu v-if="!isMenuOpen" class="w-4 h-4" />
            <X v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Search overlay -->
      <div v-if="showSearch" class="absolute top-full left-0 right-0 bg-bg-elevated/95 backdrop-blur-xl border-b border-primary/20 p-4 z-50 animate-slide-down">
        <div class="max-w-2xl mx-auto">
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search articles..."
              class="w-full pl-11 pr-4 py-3 bg-bg-dark border border-border-subtle rounded-lg 
                     text-text-primary font-mono text-sm
                     focus:outline-none focus:border-primary/50 focus:shadow-glow
                     placeholder:text-text-dim transition-all duration-300"
              autofocus
              @keydown.enter="handleSearch"
            />
            <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 text-xs font-mono text-text-dim bg-bg-dark border border-border-subtle rounded">ESC</kbd>
            </div>
          </div>
        </div>
      </div>

      <!-- Login overlay -->
      <div v-if="showLogin" class="absolute top-full right-4 w-80 bg-bg-elevated/95 backdrop-blur-xl border border-primary/20 rounded-xl p-5 z-50 animate-slide-down shadow-glow">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
          <h3 class="font-mono text-sm font-bold text-primary">sudo login</h3>
        </div>
        <form @submit.prevent="handleLogin" @click.stop class="space-y-3">
          <div v-if="loginError" class="p-2.5 bg-accent/10 text-accent rounded-lg text-xs font-mono border border-accent/20">
            {{ loginError }}
          </div>

          <div>
            <label class="block text-xs font-mono text-text-secondary mb-1.5">username</label>
            <input
              v-model="username"
              type="text"
              required
              class="input-geek"
              placeholder="admin"
            />
          </div>

          <div>
            <label class="block text-xs font-mono text-text-secondary mb-1.5">password</label>
            <input
              v-model="password"
              type="password"
              required
              class="input-geek"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            class="w-full btn btn-primary py-2.5 font-mono text-sm"
            :disabled="loginLoading"
          >
            <span class="text-primary">$</span> {{ loginLoading ? 'authenticating...' : 'authenticate' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Mobile menu overlay -->
    <div v-if="isMenuOpen" class="absolute top-full left-0 right-0 bg-bg-elevated/95 backdrop-blur-xl border-b border-primary/20 p-4 z-50 animate-slide-down md:hidden">
      <div class="max-w-7xl mx-auto space-y-1">
        <router-link
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="block px-4 py-3 font-mono text-sm text-text-secondary hover:text-primary hover:bg-bg-hover rounded-lg transition-all"
          @click="isMenuOpen = false"
        >
          {{ link.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

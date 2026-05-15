<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LayoutDashboard, FileText, Folder, Tag, MessageSquare, Image, User, KeyRound, LogOut, Terminal } from 'lucide-vue-next'
import MatrixRain from '@/components/MatrixRain.vue'

const router = useRouter()
const authStore = useAuthStore()

const navItems = [
  { name: 'dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'articles', path: '/admin/articles', icon: FileText },
  { name: 'categories', path: '/admin/categories', icon: Folder },
  { name: 'tags', path: '/admin/tags', icon: Tag },
  { name: 'comments', path: '/admin/comments', icon: MessageSquare },
  { name: 'images', path: '/admin/images', icon: Image },
  { name: 'about', path: '/admin/about', icon: User },
  { name: 'password', path: '/admin/password', icon: KeyRound },
]

const handleLogout = () => {
  authStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-bg-dark flex">
    <MatrixRain />
    <aside class="w-56 bg-bg-card/95 backdrop-blur border-r border-border-subtle flex flex-col relative z-10">
      <div class="p-4 border-b border-border-subtle">
        <div class="flex items-center gap-2">
          <Terminal class="w-4 h-4 text-primary" />
          <h2 class="font-mono text-sm font-bold text-primary">admin_panel</h2>
        </div>
      </div>

      <nav class="p-3 space-y-1 flex-grow">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-primary transition-all font-mono text-xs"
          active-class="bg-primary/10 text-primary border border-primary/20"
        >
          <component :is="item.icon" class="w-4 h-4" />
          <span>{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="p-3 border-t border-border-subtle">
        <button
          @click="handleLogout"
          class="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-accent/70 hover:bg-accent/10 hover:text-accent transition-all font-mono text-xs"
        >
          <LogOut class="w-4 h-4" />
          <span>logout</span>
        </button>
      </div>
    </aside>

    <main class="flex-1 p-6 overflow-y-auto relative z-10">
      <router-view />
    </main>
  </div>
</template>

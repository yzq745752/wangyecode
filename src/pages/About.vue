<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Terminal, Mail, Github, Code2, Heart } from 'lucide-vue-next'
import { useMeta } from '@/composables/useMeta'
import apiClient from '@/api/client'

const { setDefaultMeta } = useMeta()
setDefaultMeta('关于')

interface AboutData {
  name: string
  role: string
  passion: string
  bio: string
  philosophy: string
  email: string
  github: string
}

const about = ref<AboutData | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/config/about')
    about.value = data.data
  } catch (e) {
    console.error('Failed to load about data:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="max-w-4xl mx-auto px-4 py-16">
      <div class="flex items-center gap-2 mb-8">
        <Terminal class="w-5 h-5 text-primary" />
        <h1 class="font-mono text-2xl font-bold">
          <span class="text-primary">~/</span><span class="text-text-primary">about</span>
        </h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="card animate-pulse p-8 space-y-6">
        <div class="flex gap-8 items-center">
          <div class="w-36 h-36 rounded-xl bg-bg-elevated" />
          <div class="flex-1 space-y-3">
            <div class="h-4 bg-bg-elevated rounded w-1/2" />
            <div class="h-3 bg-bg-elevated rounded w-3/4" />
          </div>
        </div>
        <div class="h-3 bg-bg-elevated rounded w-full" />
        <div class="h-3 bg-bg-elevated rounded w-4/5" />
      </div>

      <div v-else-if="about" class="card">
        <div class="card-header">
          <div class="flex gap-1.5">
            <div class="w-3 h-3 rounded-full bg-accent/50" />
            <div class="w-3 h-3 rounded-full bg-primary/50" />
            <div class="w-3 h-3 rounded-full bg-secondary/50" />
          </div>
          <span class="font-mono text-xs text-text-dim ml-2">about.md</span>
        </div>

        <div class="p-8">
          <div class="flex flex-col md:flex-row gap-8 items-center mb-10">
            <div class="relative">
              <div class="w-36 h-36 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-border-subtle flex items-center justify-center overflow-hidden">
                <div class="text-5xl">‍💻</div>
              </div>
              <div class="absolute -bottom-2 -right-2 px-3 py-1 bg-bg-dark border border-primary/30 rounded-lg">
                <span class="font-mono text-xs text-primary animate-flicker">ONLINE</span>
              </div>
            </div>

            <div class="text-center md:text-left">
              <h2 class="font-mono text-xl font-bold text-text-primary mb-2">
                <span class="text-secondary">const</span> developer = {
              </h2>
              <div class="font-mono text-sm text-text-secondary pl-4">
                <p><span class="text-primary">name</span>: <span class="text-accent">'{{ about.name }}'</span>,</p>
                <p><span class="text-primary">role</span>: <span class="text-accent">'{{ about.role }}'</span>,</p>
                <p><span class="text-primary">passion</span>: <span class="text-accent">'{{ about.passion }}'</span></p>
              </div>
              <p class="font-mono text-sm text-text-secondary">}</p>
            </div>
          </div>

          <div class="space-y-6 border-t border-border-subtle pt-8">
            <div>
              <h3 class="font-mono text-sm font-bold text-primary mb-3 flex items-center gap-2">
                <Code2 class="w-4 h-4" /> whoami
              </h3>
              <p class="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{{ about.bio }}</p>
            </div>

            <div>
              <h3 class="font-mono text-sm font-bold text-secondary mb-3 flex items-center gap-2">
                <Heart class="w-4 h-4" /> philosophy
              </h3>
              <p class="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{{ about.philosophy }}</p>
            </div>

            <div class="border-t border-border-subtle pt-8">
              <h3 class="font-mono text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Mail class="w-4 h-4" /> contact
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a :href="'mailto:' + about.email" class="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-lg border border-border-subtle hover:border-primary/30 transition-all group">
                  <Mail class="w-4 h-4 text-text-dim group-hover:text-primary transition-colors" />
                  <span class="font-mono text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {{ about.email }}
                  </span>
                </a>
                <a :href="about.github" target="_blank" class="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-lg border border-border-subtle hover:border-secondary/30 transition-all group">
                  <Github class="w-4 h-4 text-text-dim group-hover:text-secondary transition-colors" />
                  <span class="font-mono text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {{ about.github }}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

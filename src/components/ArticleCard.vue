<script setup lang="ts">
import type { Article } from '@/types'

defineProps<{
  article: Article
}>()
</script>

<template>
  <router-link
    :to="`/article/${article.id}`"
    class="card group block animate-fade-in-up"
  >
    <div v-if="article.coverImage" class="aspect-video overflow-hidden rounded-t-xl relative">
      <img
        :src="article.coverImage"
        :alt="article.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-bg-dark/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>

    <div class="p-5">
      <div class="flex items-center gap-2 mb-3">
        <span class="badge badge-primary">
          {{ article.category.name }}
        </span>
        <span
          v-for="tag in article.tags.slice(0, 2)"
          :key="tag.id"
          class="badge badge-dim"
        >
          #{{ tag.name }}
        </span>
      </div>

      <h3 class="font-display text-lg font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {{ article.title }}
      </h3>

      <p class="text-text-secondary text-sm line-clamp-3 mb-4">
        {{ article.summary }}
      </p>

      <div class="flex items-center justify-between text-xs text-text-dim font-mono">
        <span>{{ new Date(article.createdAt).toLocaleDateString('zh-CN') }}</span>
        <span>{{ article.viewCount }} reads</span>
      </div>
    </div>
  </router-link>
</template>

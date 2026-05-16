<script setup lang="ts">
import { ref } from 'vue'
import { Share2, Twitter, Link2, Check } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  url?: string
}>()

const copied = ref(false)

const shareUrl = props.url || window.location.href
const encodedUrl = encodeURIComponent(shareUrl)
const encodedTitle = encodeURIComponent(props.title)

const shareLinks = [
  {
    name: 'Twitter',
    icon: Twitter,
    href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    color: 'hover:text-[#1DA1F2]',
  },
  {
    name: '微博',
    icon: Share2,
    href: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
    color: 'hover:text-[#E6162D]',
  },
]

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = shareUrl
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="font-mono text-xs text-text-dim mr-1">share:</span>
    <a
      v-for="link in shareLinks"
      :key="link.name"
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer"
      class="p-2 text-text-dim rounded-lg hover:bg-bg-hover transition-all"
      :class="link.color"
      :title="`Share on ${link.name}`"
    >
      <component :is="link.icon" class="w-4 h-4" />
    </a>
    <button
      @click="copyLink"
      class="p-2 text-text-dim rounded-lg hover:bg-bg-hover transition-all hover:text-primary"
      title="Copy link"
    >
      <Link2 v-if="!copied" class="w-4 h-4" />
      <Check v-else class="w-4 h-4 text-primary" />
    </button>
  </div>
</template>

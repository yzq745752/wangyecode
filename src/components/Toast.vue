<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import { CheckCircle, XCircle, Info, X } from 'lucide-vue-next'

const toast = useToastStore()

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colorMap = {
  success: 'border-primary/30 bg-primary/5 text-primary',
  error: 'border-accent/30 bg-accent/5 text-accent',
  info: 'border-secondary/30 bg-secondary/5 text-secondary',
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-glow backdrop-blur-xl min-w-[280px] max-w-sm animate-fade-in-up"
        :class="colorMap[t.type]"
      >
        <component :is="iconMap[t.type]" class="w-4 h-4 flex-shrink-0" />
        <span class="font-mono text-sm flex-1">{{ t.message }}</span>
        <button @click="toast.remove(t.id)" class="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active { animation: toastIn 0.3s ease-out; }
.toast-leave-active { animation: toastOut 0.2s ease-in; }

@keyframes toastIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes toastOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
</style>

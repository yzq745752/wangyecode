import { ref, watch } from 'vue'

const THEME_KEY = 'blog-theme'

type Theme = 'dark' | 'light'

const currentTheme = ref<Theme>('dark')

// Initialize from localStorage
const saved = localStorage.getItem(THEME_KEY)
if (saved === 'light' || saved === 'dark') {
  currentTheme.value = saved
}
document.documentElement.setAttribute('data-theme', currentTheme.value)

export function useTheme() {
  const toggle = () => {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
  }

  watch(currentTheme, (val) => {
    localStorage.setItem(THEME_KEY, val)
    document.documentElement.setAttribute('data-theme', val)
  })

  return {
    theme: currentTheme,
    toggle,
    isDark: () => currentTheme.value === 'dark',
  }
}

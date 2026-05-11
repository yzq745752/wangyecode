import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login({ username, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    return data
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  const checkAuth = async () => {
    if (!token.value) return false
    try {
      const { data } = await authApi.verify()
      user.value = data.user
      return true
    } catch {
      logout()
      return false
    }
  }

  return { user, token, isAuthenticated, login, logout, checkAuth }
})

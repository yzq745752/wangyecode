import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
  {
    path: '/article/:id',
    name: 'ArticleDetail',
    component: () => import('@/pages/ArticleDetail.vue'),
  },
  {
    path: '/category/:name',
    name: 'Category',
    component: () => import('@/pages/Category.vue'),
  },
  {
    path: '/tag/:name',
    name: 'Tag',
    component: () => import('@/pages/Tag.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/About.vue'),
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/Search.vue'),
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('@/pages/Archive.vue'),
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/pages/admin/Login.vue'),
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/pages/admin/Dashboard.vue'),
      },
      {
        path: 'articles',
        name: 'AdminArticles',
        component: () => import('@/pages/admin/Articles.vue'),
      },
      {
        path: 'articles/new',
        name: 'AdminArticleNew',
        component: () => import('@/pages/admin/ArticleEditor.vue'),
      },
      {
        path: 'articles/edit/:id',
        name: 'AdminArticleEdit',
        component: () => import('@/pages/admin/ArticleEditor.vue'),
      },
      {
        path: 'categories',
        name: 'AdminCategories',
        component: () => import('@/pages/admin/Categories.vue'),
      },
      {
        path: 'tags',
        name: 'AdminTags',
        component: () => import('@/pages/admin/Tags.vue'),
      },
      {
        path: 'comments',
        name: 'AdminComments',
        component: () => import('@/pages/admin/Comments.vue'),
      },
      {
        path: 'images',
        name: 'AdminImages',
        component: () => import('@/pages/admin/ImageManager.vue'),
      },
      {
        path: 'about',
        name: 'AdminAbout',
        component: () => import('@/pages/admin/AboutEditor.vue'),
      },
      {
        path: 'password',
        name: 'AdminPassword',
        component: () => import('@/pages/admin/PasswordChange.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      return { name: 'AdminLogin' }
    }
    try {
      jwtDecode(token)
    } catch {
      localStorage.removeItem('token')
      return { name: 'AdminLogin' }
    }
  }
})

export default router

# wangyecode 项目 Review 报告

> 审查日期: 2026-05-15

## 项目概况

个人博客项目，Vue 3 + TypeScript 前端，Express + sql.js (SQLite) 后端。主题风格为黑客/终端美学。整体功能完整，代码质量中上，但存在若干关键问题。

---

## 🔴 严重问题

### 1. SQL 注入漏洞

**位置**: `api/index.ts:200`

```typescript
"SELECT * FROM users WHERE username = '" + username.replace(/'/g, "''") + "'"
```

登录接口手动转义单引号而非使用参数化查询。这种黑名单方式可以被反斜杠或其他编码绕过。

**修复方案**: 改为参数化查询

```typescript
db.exec("SELECT * FROM users WHERE username = ?", [username])
```

---

### 2. Markdown 内容未渲染

**位置**: `ArticleDetail.vue:162`

```html
<div v-html="article.content" />
```

数据库中存的是原始 Markdown 文本，但 ArticleDetail 页面直接 `v-html` 渲染，导致读者看到的是**原始 Markdown 源码**。编辑器中预览用 `marked(content.value)` 转换正常，但详情页缺少 marked 处理步骤。

**修复方案**: 导入 `marked` 并在渲染前转换：

```typescript
import { marked } from 'marked'
// ...
<div v-html="marked(article.content)" />
```

---

### 3. 阅读计数每次访问 +2

**位置**: `api/index.ts:378, 400-401`

```typescript
// line 378: DB 里 +1
db.run('UPDATE articles SET viewCount = viewCount + 1 WHERE id = ?', [id])

// line 400-401: 响应里又 +1
viewCount: (article.viewCount as number) + 1,
```

数据库先递增，响应中又手动加 1，导致每次访问增加 2 次阅读。

**修复方案**: 只做一次递增，响应中返回 DB 更新后的实际值（可直接复用数据库中增量后的值，或重新查询）。

---

### 4. `.gitignore` 配置错误

**位置**: `.gitignore:14`

```
src/      # ← 前端源码被 gitignore！（但因历史提交已被跟踪）
data/     # ← 未在 gitignore 中，blog.db 和上传图片被跟踪
```

- `src/` 被忽略意味着新 clone 仓库后 `src/` 目录下的新增文件不会被跟踪
- `data/` 未被忽略导致 SQLite 数据库文件和用户上传图片被提交到版本控制

---

## 🟡 中等问题

### 5. JWT_SECRET 硬编码

**位置**: `api/index.ts:16`

```typescript
const JWT_SECRET = 'blog-jwt-secret-key-2024'
```

密钥写死在源码中，所有部署实例共享同一密钥。

**修复方案**: 使用环境变量：

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-only'
```

---

### 6. Comment 类型包含错误字段

**位置**: `types/index.ts:61-62`

```typescript
export interface Comment {
  id: number
  articleId: number
  parentId: number | null
  author: string
  email: string
  content: string
  isApproved: number
  createdAt: string
  replies?: Comment[]
  message: string      // ❌ 不应在 Comment 内
  statusCode: number   // ❌ 不应在 Comment 内
}
```

`message` 和 `statusCode` 是某种 API 响应接口的残留字段，被错误地遗留在了 Comment 接口中。

---

### 7. 搜索输入无法提交

**位置**: `Navbar.vue`

`handleSearch` 函数已定义但**未绑定到任何事件**。搜索框没有 `@keydown.enter` 也没有提交按钮，用户按回车无效。

**修复方案**: 给搜索 input 添加 `@keydown.enter="handleSearch"`。

---

### 8. 评论只支持单层嵌套

**位置**: `api/index.ts:545-549`

```typescript
const nestReplies = (comment: any) => {
    comment.replies = replies
      .filter((r: any) => r.parentId === comment.id)
      .map((r: any) => { r.replies = []; return r })  // 子回复的 replies 永远是空数组
    return comment
}
```

子回复的 `replies` 被硬编码为 `[]`，没有递归处理更深层嵌套。当某个回复也被回复时，会被忽略。

---

### 9. 前端路由守卫不做 Token 验证

**位置**: `router/index.ts:113-120`

```typescript
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      return { name: 'AdminLogin' }
    }
  }
})
```

只检查 `localStorage.getItem('token')` 是否存在，不验证 JWT 有效性。任意字符串都能触发守卫放行。

---

### 10. XSS 风险

**位置**: `ArticleDetail.vue`, `ArticleEditor.vue`

用户提交的文章内容通过 `v-html` 渲染：

```html
<div v-html="article.content" />
```

虽然编辑器使用 Markdown，但 API 层没有对内容做任何过滤/转义，存在存储型 XSS 风险。

---

## 🔵 建议改进

| 类别 | 问题 | 位置 | 建议 |
|------|------|------|------|
| 架构 | 单文件后端 | `api/index.ts` (1044行) | 拆分为 routes / controllers / services |
| 类型 | 大量 `any` | 整个 `api/index.ts` | 为数据库行定义类型接口 |
| 配置 | `BASE_URL` 硬编码 | `api/index.ts:869,912` | 使用环境变量，否则 sitemap/rss 链接在部署后错误 |
| 代码质量 | DB 行转对象重复 10+ 次 | `api/index.ts` | 提取为通用 `parseRows` 工具函数 |
| 安全性 | 路径遍历防护不足 | `api/index.ts:1029` | 使用 `path.resolve` 而非 `path.join` 配合 `startsWith` |
| 功能 | 无服务端分页上限 | `api/index.ts` | 对大 `limit` 值做上限限制 |
| 功能 | 无速率限制 | 整个 API | 评论/登录接口应加限流防止滥用 |
| 工程化 | 无 eslint/prettier | 项目根目录 | 建议加入统一代码风格和 lint 检查 |
| 构建 | `vue-tsc` 可能不通过 | `package.json:10` | 由于 `any` 滥用和 Comment 类型错误，`npm run build` 可能失败 |
| Docker | Dockerfile 在 dev 模式下冗余 | `docker/` | 当前 dev 模式下使用本地 `npm run dev`，Dockerfile 主要用于参考 |

---

## 优先级建议

| 优先级 | 问题 |
|--------|------|
| **P0 - 立刻修复** | SQL 注入、Markdown 未渲染、阅读计数 bug |
| **P1 - 尽快修复** | JWT_SECRET 环境变量化、Comment 类型、搜索提交绑定、.gitignore |
| **P2 - 后续优化** | 后端模块拆分、XSS 防护、类型系统完善、限流、ESLint |

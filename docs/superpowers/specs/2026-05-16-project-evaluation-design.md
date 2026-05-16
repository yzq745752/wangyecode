# 项目全面评估与改进方案

**日期：** 2026-05-16
**范围：** personal-blog（王野代码）全栈项目
**策略：** 混合迭代 — 安全 → 类型 → 架构 → 去重 → 工程化 → 打磨

---

## 项目现状摘要

- **前端：** Vue 3 + Composition API + TypeScript + Tailwind CSS + Pinia + Vue Router
- **后端：** Express 4 + sql.js (SQLite WASM) + JWT 认证（单文件 1044 行）
- **数据库：** 6 张表（users, categories, tags, articles, article_tags, comments, site_config）
- **已实现：** 9 个公开页面 + 10 个管理页面 + SEO/RSS/Docker

---

## 第 1 轮：安全热修复

| 问题 | 位置 | 方案 |
|------|------|------|
| JWT_SECRET 硬编码回退 | api/index.ts:16 | 去掉 `\|\| 'blog-jwt-secret-key-2024'`，启动时未设环境变量则退出 |
| BASE_URL 硬编码 | api/index.ts:868,911 | `http://localhost:3000` → `process.env.BASE_URL \|\| 'http://localhost:3000'` |
| data/ 仍被 git 追踪 | git 索引 | `git rm --cached data/blog.db data/uploads/*` (.gitignore 已有 data/) |
| 无速率限制 | api/index.ts | 安装 express-rate-limit，登录 5次/15分钟，评论 10次/小时 |

## 第 2 轮：类型安全

| 改动 | 说明 |
|------|------|
| 添加 DB 行类型 | 在 api/index.ts 定义 ArticleRow, CategoryRow, TagRow, CommentRow, UserRow |
| 提取 parseRows<T> | 泛型函数替代 10+ 处重复的 columns.forEach 转换 |
| 消除 any | 替换后端 ~30 处 any 为具体类型 |

## 第 3 轮：后端模块化

拆分 1044 行 api/index.ts 为：

```
api/
├── index.ts           # 入口 (~40行)
├── db.ts              # 数据库初始化、parseRows、saveDb (~30行)
├── middleware/
│   └── auth.ts        # JWT 中间件 (~15行)
└── routes/
    ├── auth.ts        # 登录/改密 (~60行)
    ├── articles.ts    # 文章 CRUD (~180行)
    ├── categories.ts  # 分类 (~50行)
    ├── tags.ts        # 标签 (~50行)
    ├── comments.ts    # 评论 (~100行)
    ├── site.ts        # 配置/Sitemap/RSS/导出 (~120行)
    └── images.ts      # 图片管理 (~50行)
```

每个路由文件 export Router，入口 app.use() 挂载。db 通过 db.ts 的 getDb() 共享。

## 第 4 轮：前端去重

提取 `useArticleList` 组合函数（src/composables/useArticleList.ts），消除 Home/Category/Tag/Search 四页面（共 637 行）的重复分页逻辑。

```ts
function useArticleList(fetchFn: (params) => Promise<ArticleListResponse>) {
  // articles, loading, loadingMore, page, totalArticles 状态
  // fetchArticles(reset?), loadMore() 方法
  return { articles, loading, loadingMore, page, totalArticles, fetchArticles, loadMore }
}
```

## 第 5 轮：工程化

- **ESLint + Prettier** — TypeScript 规则 + Vue 插件 + eslint-config-prettier
- **修复 Navbar 登录** — 用 authStore/authApi 替代原生 fetch
- **验证 vue-tsc** — 第 2 轮类型化后确认构建通过

## 第 6 轮：体验打磨

- **列表 API 去 content** — SELECT 指定列名，不返回 Markdown 正文
- **分页上限** — Math.min(limit, 50)
- **UI 一致性** — Tag.vue 旧 CSS 类名改为 Tailwind 主题类
- **.env.example** — 文档化 JWT_SECRET, BASE_URL, PORT

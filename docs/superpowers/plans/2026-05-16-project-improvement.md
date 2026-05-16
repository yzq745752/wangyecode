# Project Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute 6 rounds of incremental improvements covering security, type safety, architecture, deduplication, engineering, and polish on the personal-blog project.

**Architecture:** Each round is independent and can be committed separately. Rounds 1-2 modify the existing single-file backend; Round 3 splits it into modular route files; Rounds 4-6 touch both frontend and backend.

**Tech Stack:** Vue 3 + TypeScript + Pinia (frontend), Express 4 + sql.js + JWT (backend)

---

### Task 1.1: Remove JWT_SECRET hardcoded fallback

**Files:**
- Modify: `api/index.ts:16`

- [ ] **Step 1: Replace hardcoded JWT_SECRET fallback with env-only**

Edit `api/index.ts`, change line 16 from:
```ts
const JWT_SECRET = process.env.JWT_SECRET || 'blog-jwt-secret-key-2024'
```
To:
```ts
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}
```

- [ ] **Step 2: Commit**

```bash
git add api/index.ts
git commit -m "fix: remove JWT_SECRET hardcoded fallback, require env variable"
```

---

### Task 1.2: Replace hardcoded BASE_URL in sitemap and RSS

**Files:**
- Modify: `api/index.ts:868,911`

- [ ] **Step 1: Replace BASE_URL with env-based value**

In `api/index.ts`, change line 868:
```ts
const BASE_URL = 'http://localhost:3000'
```
To:
```ts
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
```

In `api/index.ts`, change line 911:
```ts
const BASE_URL = 'http://localhost:3000'
```
To:
```ts
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
```

- [ ] **Step 2: Commit**

```bash
git add api/index.ts
git commit -m "fix: use BASE_URL env variable for sitemap and RSS"
```

---

### Task 1.3: Untrack data/ files from git

**Files:**
- Modify: git index (no file changes)

- [ ] **Step 1: Remove tracked data/ files from git index**

```bash
git rm --cached data/blog.db data/uploads/1778666195995-x73k3u.jpg
```

Verify `.gitignore` already contains `data/`:
```bash
grep '^data/' .gitignore
```
Expected: `data/`

- [ ] **Step 2: Commit**

```bash
git commit -m "fix: remove data/ files from git tracking"
```

---

### Task 1.4: Add rate limiting

**Files:**
- Modify: `api/index.ts` (add import and middleware)
- Modify: `package.json` (add dependency)

- [ ] **Step 1: Install express-rate-limit**

```bash
npm install express-rate-limit
```

- [ ] **Step 2: Add rate limit middleware to api/index.ts**

Add import near the top of `api/index.ts` (after line 9):
```ts
import rateLimit from 'express-rate-limit'
```

Add limiters after the `app.use(express.json())` line (after line 49):
```ts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: '评论提交过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})
```

- [ ] **Step 3: Apply limiters to routes**

Change `app.post('/api/auth/login', ...)` to `app.post('/api/auth/login', loginLimiter, ...)` (line 193).

Change `app.post('/api/articles/:id/comments', ...)` to `app.post('/api/articles/:id/comments', commentLimiter, ...)` (line 554).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json api/index.ts
git commit -m "feat: add rate limiting for login and comment endpoints"
```

---

### Task 2.1: Define DB row interfaces

**Files:**
- Create: `api/types.ts`

- [ ] **Step 1: Create api/types.ts with DB row interfaces**

```ts
export interface ArticleRow {
  id: number
  title: string
  content: string
  summary: string | null
  coverImage: string | null
  categoryId: number
  viewCount: number
  createdAt: string
  updatedAt: string
  categoryName?: string
}

export interface CategoryRow {
  id: number
  name: string
  createdAt: string
  articleCount?: number
}

export interface TagRow {
  id: number
  name: string
  createdAt: string
  articleCount?: number
}

export interface CommentRow {
  id: number
  articleId: number
  parentId: number | null
  author: string
  email: string
  content: string
  isApproved: number
  createdAt: string
  articleTitle?: string
}

export interface UserRow {
  id: number
  username: string
  password: string
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add api/types.ts
git commit -m "feat: add DB row type definitions"
```

---

### Task 2.2: Extract parseRows helper and db module

**Files:**
- Create: `api/db.ts`
- Modify: `api/index.ts` (import from db.ts)

- [ ] **Step 1: Create api/db.ts with database init and parseRows**

```ts
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../data/blog.db')

export async function initDb() {
  const SqlJs = await initSqlJs()

  let db: SqlJs.Database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SqlJs.Database(buffer)
  } else {
    db = new SqlJs.Database()
  }

  return { db, SqlJs }
}

export function saveDb(db: SqlJs.Database) {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  }
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

export function parseRows<T>(result: SqlJs.QueryExecResult[]): T[] {
  if (result.length === 0 || !result[0].values) return []
  const { columns, values } = result[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, idx) => { obj[col] = row[idx] })
    return obj as T
  })
}

export function parseFirstRow<T>(result: SqlJs.QueryExecResult[]): T | null {
  const rows = parseRows<T>(result)
  return rows.length > 0 ? rows[0] : null
}

export { DB_PATH }
```

- [ ] **Step 2: Update api/index.ts to import from db.ts**

Replace lines 5-7 and 16-17 and 52-69 in `api/index.ts`:

Remove:
```ts
import initSqlJs from 'sql.js'

const JWT_SECRET = process.env.JWT_SECRET || 'blog-jwt-secret-key-2024'
const DB_PATH = path.join(__dirname, '../data/blog.db')
```

Add import:
```ts
import { initDb, saveDb, parseRows, parseFirstRow } from './db.js'
```

Replace the init block (lines 52-69, the `SqlJs` init and `saveDb` function) with:
```ts
const { db } = await initDb()

const save = () => saveDb(db)
```

Then replace all `saveDb()` calls with `save()`.

- [ ] **Step 3: Commit**

```bash
git add api/db.ts api/index.ts
git commit -m "refactor: extract db init, parseRows helper to api/db.ts"
```

---

### Task 2.3: Replace any types with typed parseRows

**Files:**
- Modify: `api/index.ts`

- [ ] **Step 1: Add type imports and replace all parseRows patterns**

Add at top of `api/index.ts`:
```ts
import type { ArticleRow, CategoryRow, TagRow, CommentRow } from './types.js'
```

Then replace every `columns.forEach((col, idx) => { obj[col] = row[idx] })` pattern with `parseRows<T>(result)` calls throughout the file. Key replacements:

- `/api/articles` list (lines 301-312): Replace manual loop with `const articles = parseRows<ArticleRow>(articlesResult)`
- `/api/articles/:id` (lines 371-376): Replace with `const article = parseFirstRow<ArticleRow>(result)`
- `/api/articles/:id/related` (lines 437-445): Replace with `const articles = parseRows<ArticleRow>(result)`
- Comments list (lines 531-539): Replace with `const allComments = parseRows<CommentRow>(result)`
- Admin comments (lines 608-616): Replace with `const comments = parseRows<CommentRow>(result)`
- Categories (lines 661-671): Replace with `const categories = parseRows<CategoryRow>(result)`
- Tags (lines 745-755): Replace with `const tags = parseRows<TagRow>(result)`
- RSS (lines 921-925): Replace with `const items = parseRows<ArticleRow>(articles)`

Also replace `(req as any).user` with `(req as Request & { user: { id: number; username: string } }).user`.

- [ ] **Step 2: Verify no remaining `any` in key paths**

```bash
grep -c ': any' api/index.ts
```

- [ ] **Step 3: Commit**

```bash
git add api/index.ts
git commit -m "refactor: replace any types with typed parseRows throughout API"
```

---

### Task 3.1: Create auth middleware module

**Files:**
- Create: `api/middleware/auth.ts`

- [ ] **Step 1: Create api/middleware/auth.ts**

```ts
import express from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '未授权' })
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as { id: number; username: string }
    ;(req as any).user = user
    next()
  } catch {
    return res.status(403).json({ message: '无效的令牌' })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/middleware/auth.ts
git commit -m "refactor: extract JWT auth middleware to separate module"
```

---

### Task 3.2: Create route modules (auth, categories, tags)

**Files:**
- Create: `api/routes/auth.ts`
- Create: `api/routes/categories.ts`
- Create: `api/routes/tags.ts`

- [ ] **Step 1: Create api/routes/auth.ts**

```ts
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type SqlJs from 'sql.js'
import { saveDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const JWT_SECRET = process.env.JWT_SECRET!

export function createAuthRouter(db: SqlJs.Database) {
  const router = Router()
  const save = () => saveDb(db)

  router.post('/login', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' })
    }
    const result = db.exec("SELECT * FROM users WHERE username = ?", [username])
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    const userRow = result[0].values[0]
    const storedPassword = userRow[2] as string
    if (!bcrypt.compareSync(password, storedPassword)) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }
    const token = jwt.sign({ id: userRow[0], username: userRow[1] }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user: { id: userRow[0], username: userRow[1] } })
  })

  router.get('/verify', authenticateToken, (req, res) => {
    res.json({ user: (req as any).user })
  })

  router.put('/password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '当前密码和新密码不能为空' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码至少6位' })
    }
    const user = (req as any).user as { id: number; username: string }
    const result = db.exec('SELECT password FROM users WHERE id = ?', [user.id])
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    const storedPassword = result[0].values[0] as string
    if (!bcrypt.compareSync(currentPassword, storedPassword)) {
      return res.status(400).json({ message: '当前密码错误' })
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10)
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id])
    save()
    res.json({ message: '密码修改成功' })
  })

  return router
}
```

- [ ] **Step 2: Create api/routes/categories.ts**

```ts
import { Router } from 'express'
import type SqlJs from 'sql.js'
import { saveDb, parseRows } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import type { CategoryRow } from '../types.js'

export function createCategoriesRouter(db: SqlJs.Database) {
  const router = Router()
  const save = () => saveDb(db)

  router.get('/', (_req, res) => {
    const result = db.exec(`
      SELECT c.id, c.name, c.createdAt, COUNT(a.id) as articleCount
      FROM categories c LEFT JOIN articles a ON c.id = a.categoryId
      GROUP BY c.id ORDER BY c.createdAt DESC
    `)
    res.json({ data: parseRows<CategoryRow>(result) })
  })

  router.post('/', authenticateToken, (req, res) => {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: '分类名称不能为空' })
    try {
      db.run('INSERT INTO categories (name) VALUES (?)', [name])
      save()
      const result = db.exec('SELECT * FROM categories WHERE name = ?', [name])
      res.status(201).json({ data: result.length > 0 ? result[0].values[0] : null })
    } catch {
      res.status(400).json({ message: '分类名称已存在' })
    }
  })

  router.put('/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const { name } = req.body
    if (!name) return res.status(400).json({ message: '分类名称不能为空' })
    const existing = db.exec('SELECT id FROM categories WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '分类不存在' })
    }
    try {
      db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id])
      save()
      const result = db.exec('SELECT * FROM categories WHERE id = ?', [id])
      res.json({ data: result.length > 0 ? result[0].values[0] : null })
    } catch {
      res.status(400).json({ message: '分类名称已存在' })
    }
  })

  router.delete('/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const existing = db.exec('SELECT id FROM categories WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '分类不存在' })
    }
    const articleCount = db.exec('SELECT COUNT(*) FROM articles WHERE categoryId = ?', [id])
    const count = articleCount.length > 0 && articleCount[0].values.length > 0 ? articleCount[0].values[0][0] : 0
    if ((count as number) > 0) {
      return res.status(400).json({ message: '该分类下还有文章，无法删除' })
    }
    db.run('DELETE FROM categories WHERE id = ?', [id])
    save()
    res.json({ message: '删除成功' })
  })

  return router
}
```

- [ ] **Step 3: Create api/routes/tags.ts** (same pattern as categories but for tags table)

```ts
import { Router } from 'express'
import type SqlJs from 'sql.js'
import { saveDb, parseRows } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import type { TagRow } from '../types.js'

export function createTagsRouter(db: SqlJs.Database) {
  const router = Router()
  const save = () => saveDb(db)

  router.get('/', (_req, res) => {
    const result = db.exec(`
      SELECT t.id, t.name, t.createdAt, COUNT(at.articleId) as articleCount
      FROM tags t LEFT JOIN article_tags at ON t.id = at.tagId
      GROUP BY t.id ORDER BY t.createdAt DESC
    `)
    res.json({ data: parseRows<TagRow>(result) })
  })

  router.post('/', authenticateToken, (req, res) => {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: '标签名称不能为空' })
    try {
      db.run('INSERT INTO tags (name) VALUES (?)', [name])
      save()
      const result = db.exec('SELECT * FROM tags WHERE name = ?', [name])
      res.status(201).json({ data: result.length > 0 ? result[0].values[0] : null })
    } catch {
      res.status(400).json({ message: '标签名称已存在' })
    }
  })

  router.put('/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const { name } = req.body
    if (!name) return res.status(400).json({ message: '标签名称不能为空' })
    const existing = db.exec('SELECT id FROM tags WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '标签不存在' })
    }
    try {
      db.run('UPDATE tags SET name = ? WHERE id = ?', [name, id])
      save()
      const result = db.exec('SELECT * FROM tags WHERE id = ?', [id])
      res.json({ data: result.length > 0 ? result[0].values[0] : null })
    } catch {
      res.status(400).json({ message: '标签名称已存在' })
    }
  })

  router.delete('/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const existing = db.exec('SELECT id FROM tags WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '标签不存在' })
    }
    db.run('DELETE FROM tags WHERE id = ?', [id])
    save()
    res.json({ message: '删除成功' })
  })

  return router
}
```

- [ ] **Step 4: Commit**

```bash
git add api/routes/
git commit -m "refactor: extract auth, categories, tags route modules"
```

---

### Task 3.3: Create articles route module

**Files:**
- Create: `api/routes/articles.ts`

- [ ] **Step 1: Create api/routes/articles.ts**

```ts
import { Router } from 'express'
import type SqlJs from 'sql.js'
import { saveDb, parseRows, parseFirstRow } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import type { ArticleRow, TagRow } from '../types.js'

export function createArticlesRouter(db: SqlJs.Database) {
  const router = Router()
  const save = () => saveDb(db)

  router.get('/', (req, res) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 9
    const category = req.query.category as string
    const tag = req.query.tag as string
    const search = req.query.search as string
    const offset = (page - 1) * limit

    const whereClauses: string[] = []
    const params: (string | number)[] = []

    if (category) {
      whereClauses.push("c.name = ?")
      params.push(category)
    }
    if (tag) {
      whereClauses.push("t.name = ?")
      params.push(tag)
    }
    if (search) {
      whereClauses.push("(a.title LIKE ? OR a.content LIKE ?)")
      params.push(`%${search}%`, `%${search}%`)
    }

    const whereSql = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : ''

    let countSql = `SELECT COUNT(DISTINCT a.id) FROM articles a LEFT JOIN categories c ON a.categoryId = c.id`
    if (tag) countSql += ` LEFT JOIN article_tags at ON a.id = at.articleId LEFT JOIN tags t ON at.tagId = t.id`
    countSql += whereSql
    const countResult = db.exec(countSql, params)
    const total = countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] as number : 0

    let sql = `
      SELECT DISTINCT a.id, a.title, a.summary, a.coverImage, a.categoryId, a.viewCount, a.createdAt, a.updatedAt, c.name as categoryName
      FROM articles a LEFT JOIN categories c ON a.categoryId = c.id
    `
    if (tag) sql += ` LEFT JOIN article_tags at ON a.id = at.articleId LEFT JOIN tags t ON at.tagId = t.id`
    sql += whereSql + ` ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const articlesResult = db.exec(sql, params)
    const articles = parseRows<ArticleRow>(articlesResult)

    const articlesWithTags = articles.map((article) => {
      const tagsResult = db.exec(
        `SELECT t.id, t.name FROM tags t INNER JOIN article_tags at ON t.id = at.tagId WHERE at.articleId = ?`,
        [article.id]
      )
      const tags = parseRows<TagRow>(tagsResult)
      return {
        id: article.id, title: article.title, summary: article.summary,
        coverImage: article.coverImage, categoryId: article.categoryId,
        category: { id: article.categoryId, name: article.categoryName },
        tags, createdAt: article.createdAt, updatedAt: article.updatedAt,
        viewCount: article.viewCount,
      }
    })

    res.json({ data: articlesWithTags, total, page, limit })
  })

  router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id)
    const result = db.exec(
      `SELECT a.id, a.title, a.content, a.summary, a.coverImage, a.categoryId, a.viewCount, a.createdAt, a.updatedAt, c.name as categoryName
       FROM articles a LEFT JOIN categories c ON a.categoryId = c.id WHERE a.id = ?`, [id]
    )
    const article = parseFirstRow<ArticleRow>(result)
    if (!article) return res.status(404).json({ message: '文章不存在' })

    db.run('UPDATE articles SET viewCount = viewCount + 1 WHERE id = ?', [id])
    save()

    const tagsResult = db.exec(
      `SELECT t.id, t.name FROM tags t INNER JOIN article_tags at ON t.id = at.tagId WHERE at.articleId = ?`, [id]
    )
    const tags = parseRows<TagRow>(tagsResult)

    res.json({
      data: {
        ...article, viewCount: article.viewCount,
        category: { id: article.categoryId, name: article.categoryName }, tags,
      },
    })
  })

  router.get('/:id/related', (req, res) => {
    const id = parseInt(req.params.id)
    const article = db.exec('SELECT categoryId FROM articles WHERE id = ?', [id])
    if (article.length === 0 || article[0].values.length === 0) {
      return res.json({ data: [] })
    }
    const categoryId = article[0].values[0][0] as number

    const result = db.exec(
      `SELECT DISTINCT a.id, a.title, a.summary, a.coverImage, a.categoryId, a.createdAt, a.viewCount,
              c.name as categoryName,
              (SELECT COUNT(*) FROM article_tags WHERE articleId = a.id AND tagId IN (SELECT tagId FROM article_tags WHERE articleId = ?)) as tagMatchCount
       FROM articles a LEFT JOIN categories c ON a.categoryId = c.id LEFT JOIN article_tags at2 ON a.id = at2.articleId
       WHERE a.id != ? AND (a.categoryId = ? OR at2.tagId IN (SELECT tagId FROM article_tags WHERE articleId = ?))
       GROUP BY a.id
       ORDER BY CASE WHEN a.categoryId = ? THEN 1 ELSE 0 END + 0.1 * tagMatchCount DESC, a.createdAt DESC
       LIMIT 4`, [id, id, categoryId, id, categoryId]
    )
    res.json({ data: parseRows<ArticleRow>(result) })
  })

  router.post('/', authenticateToken, (req, res) => {
    const { title, content, summary, coverImage, categoryId, tagIds } = req.body
    if (!title || !content || !categoryId) {
      return res.status(400).json({ message: '标题、内容和分类不能为空' })
    }
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO articles (title, content, summary, coverImage, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, content, summary, coverImage, categoryId, now, now]
    )
    const idResult = db.exec("SELECT last_insert_rowid()")
    const articleId = idResult[0].values[0][0] as number
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        db.run('INSERT INTO article_tags (articleId, tagId) VALUES (?, ?)', [articleId, tagId])
      }
    }
    save()
    const created = db.exec(`SELECT * FROM articles WHERE id = ?`, [articleId])
    res.status(201).json({ data: created.length > 0 ? created[0].values[0] : null })
  })

  router.put('/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const { title, content, summary, coverImage, categoryId, tagIds } = req.body
    const existing = db.exec('SELECT id FROM articles WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '文章不存在' })
    }
    const now = new Date().toISOString()
    db.run(
      `UPDATE articles SET title = ?, content = ?, summary = ?, coverImage = ?, categoryId = ?, updatedAt = ? WHERE id = ?`,
      [title, content, summary, coverImage, categoryId, now, id]
    )
    db.run('DELETE FROM article_tags WHERE articleId = ?', [id])
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        db.run('INSERT INTO article_tags (articleId, tagId) VALUES (?, ?)', [id, tagId])
      }
    }
    save()
    const updated = db.exec('SELECT * FROM articles WHERE id = ?', [id])
    res.json({ data: updated.length > 0 ? updated[0].values[0] : null })
  })

  router.delete('/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const existing = db.exec('SELECT id FROM articles WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '文章不存在' })
    }
    db.run('DELETE FROM articles WHERE id = ?', [id])
    save()
    res.json({ message: '删除成功' })
  })

  return router
}
```

- [ ] **Step 2: Commit**

```bash
git add api/routes/articles.ts
git commit -m "refactor: extract articles route module"
```

---

### Task 3.4: Create comments route module

**Files:**
- Create: `api/routes/comments.ts`

- [ ] **Step 1: Create api/routes/comments.ts**

```ts
import { Router } from 'express'
import type SqlJs from 'sql.js'
import { saveDb, parseRows } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import type { CommentRow } from '../types.js'

export function createCommentsRouter(db: SqlJs.Database) {
  const router = Router()
  const save = () => saveDb(db)

  router.get('/articles/:id/comments', (req, res) => {
    const articleId = parseInt(req.params.id)
    const result = db.exec(
      `SELECT * FROM comments WHERE articleId = ? AND isApproved = 1 ORDER BY createdAt DESC`,
      [articleId]
    )
    const allComments = parseRows<CommentRow>(result)

    const topLevel = allComments.filter((c) => !c.parentId)
    const replies = allComments.filter((c) => c.parentId)

    const nestReplies = (comment: CommentRow): CommentRow & { replies: CommentRow[] } => {
      const childReplies = replies.filter((r) => r.parentId === comment.id)
      return { ...comment, replies: childReplies.map(nestReplies) }
    }

    res.json({ data: topLevel.map(nestReplies) })
  })

  router.post('/articles/:id/comments', (req, res) => {
    const articleId = parseInt(req.params.id)
    const { author, email, content, parentId } = req.body

    if (!author || !content) {
      return res.status(400).json({ message: '昵称和评论内容不能为空' })
    }
    const article = db.exec('SELECT id FROM articles WHERE id = ?', [articleId])
    if (article.length === 0 || article[0].values.length === 0) {
      return res.status(404).json({ message: '文章不存在' })
    }
    if (parentId) {
      const parent = db.exec('SELECT id FROM comments WHERE id = ? AND articleId = ?', [parentId, articleId])
      if (parent.length === 0 || parent[0].values.length === 0) {
        return res.status(400).json({ message: '父评论不存在' })
      }
    }

    const now = new Date().toISOString()
    db.run(
      `INSERT INTO comments (articleId, parentId, author, email, content, isApproved, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [articleId, parentId || null, author, email || '', content, now]
    )
    save()

    const idResult = db.exec("SELECT last_insert_rowid()")
    const commentId = idResult[0].values[0][0] as number
    res.status(201).json({
      data: { id: commentId, articleId, author, email, content, parentId: parentId || null, isApproved: 0, createdAt: now },
      message: '评论已提交，等待审核',
    })
  })

  router.get('/admin/comments', authenticateToken, (req, res) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    const countResult = db.exec('SELECT COUNT(*) FROM comments')
    const total = countResult.length > 0 ? countResult[0].values[0][0] as number : 0

    const result = db.exec(
      `SELECT c.id, c.articleId, c.parentId, c.author, c.email, c.content, c.isApproved, c.createdAt, a.title as articleTitle
       FROM comments c LEFT JOIN articles a ON c.articleId = a.id
       ORDER BY c.createdAt DESC LIMIT ? OFFSET ?`, [limit, offset]
    )
    res.json({ data: parseRows<CommentRow>(result), total, page, limit })
  })

  router.put('/admin/comments/:id/approve', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const { isApproved } = req.body
    const existing = db.exec('SELECT id FROM comments WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '评论不存在' })
    }
    db.run('UPDATE comments SET isApproved = ? WHERE id = ?', [isApproved ? 1 : 0, id])
    save()
    res.json({ message: isApproved ? '评论已通过' : '评论已驳回' })
  })

  router.delete('/admin/comments/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const existing = db.exec('SELECT id FROM comments WHERE id = ?', [id])
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ message: '评论不存在' })
    }
    db.run('DELETE FROM comments WHERE id = ? OR parentId = ?', [id, id])
    save()
    res.json({ message: '删除成功' })
  })

  return router
}
```

- [ ] **Step 2: Commit**

```bash
git add api/routes/comments.ts
git commit -m "refactor: extract comments route module"
```

---

### Task 3.5: Create site and images route modules

**Files:**
- Create: `api/routes/site.ts`
- Create: `api/routes/images.ts`

- [ ] **Step 1: Create api/routes/site.ts**

```ts
import { Router } from 'express'
import type SqlJs from 'sql.js'
import { saveDb, parseRows } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'
import type { ArticleRow } from '../types.js'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function createSiteRouter(db: SqlJs.Database) {
  const router = Router()
  const save = () => saveDb(db)

  // About page config (public)
  router.get('/config/about', (_req, res) => {
    const result = db.exec("SELECT value FROM site_config WHERE key = 'about'")
    if (result.length === 0 || result[0].values.length === 0) return res.json({ data: null })
    try { res.json({ data: JSON.parse(result[0].values[0] as string) }) }
    catch { res.json({ data: null }) }
  })

  router.put('/config/about', authenticateToken, (req, res) => {
    const { name, role, passion, bio, philosophy, email, github } = req.body
    const value = JSON.stringify({ name, role, passion, bio, philosophy, email, github })
    db.run("INSERT OR REPLACE INTO site_config (key, value, updatedAt) VALUES ('about', ?, ?)", [value, new Date().toISOString()])
    save()
    res.json({ message: '保存成功' })
  })

  // Sitemap
  router.get('/sitemap.xml', (_req, res) => {
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
    const articles = db.exec('SELECT id, title, updatedAt FROM articles ORDER BY updatedAt DESC')

    let urls = `
  <url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${BASE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`

    if (articles.length > 0) {
      for (const row of articles[0].values) {
        const [id, _title, updatedAt] = row
        const lastmod = updatedAt ? new Date(updatedAt as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        urls += `\n  <url><loc>${BASE_URL}/article/${id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      }
    }

    res.set('Content-Type', 'application/xml')
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`)
  })

  // RSS
  router.get('/rss.xml', (_req, res) => {
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
    const articles = db.exec(
      `SELECT a.id, a.title, a.summary, a.content, a.createdAt, c.name as categoryName
       FROM articles a LEFT JOIN categories c ON a.categoryId = c.id ORDER BY a.createdAt DESC LIMIT 20`
    )

    let items = ''
    const parsed = parseRows<ArticleRow>(articles)
    for (const item of parsed) {
      const pubDate = new Date(item.createdAt).toUTCString()
      const description = item.summary
        ? escapeXml(item.summary)
        : escapeXml((item.content || '').replace(/<[^>]*>/g, '').slice(0, 300))
      items += `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${BASE_URL}/article/${item.id}</link>
    <guid>${BASE_URL}/article/${item.id}</guid>
    <description>${description}</description>
    <category>${escapeXml(item.categoryName || '')}</category>
    <pubDate>${pubDate}</pubDate>
  </item>\n`
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>个人博客</title>
    <link>${BASE_URL}</link>
    <description>分享技术、记录生活</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>\n${items}  </channel>\n</rss>`

    res.set('Content-Type', 'application/rss+xml; charset=utf-8')
    res.send(xml)
  })

  // Data export
  router.get('/admin/export', authenticateToken, (req, res) => {
    try {
      const categories = db.exec('SELECT * FROM categories ORDER BY id')
      const tags = db.exec('SELECT * FROM tags ORDER BY id')
      const articles = db.exec(`
        SELECT a.*, c.name as categoryName FROM articles a LEFT JOIN categories c ON a.categoryId = c.id ORDER BY a.id
      `)
      const articleTags = db.exec('SELECT * FROM article_tags ORDER BY articleId, tagId')
      const comments = db.exec('SELECT * FROM comments ORDER BY id')

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        categories: parseRows(categories),
        tags: parseRows(tags),
        articles: parseRows(articles),
        articleTags: parseRows(articleTags),
        comments: parseRows(comments),
      }

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="blog-export-${new Date().toISOString().slice(0, 10)}.json"`)
      res.json(exportData)
    } catch {
      res.status(500).json({ message: 'Export failed' })
    }
  })

  return router
}
```

- [ ] **Step 2: Create api/routes/images.ts**

```ts
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authenticateToken } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOADS_DIR = path.join(__dirname, '../../data/uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('仅支持图片文件 (jpg, jpeg, png, gif, webp, svg)'))
  },
})

export function createImagesRouter() {
  const router = Router()

  router.post('/upload', authenticateToken, (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: '文件大小不能超过 5MB' })
        }
        return res.status(400).json({ message: err.message || '上传失败' })
      }
      if (!req.file) return res.status(400).json({ message: '请选择图片' })
      res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename })
    })
  })

  router.get('/admin/images', authenticateToken, (_req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR)
      const images = files
        .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
        .map(f => {
          const stat = fs.statSync(path.join(UPLOADS_DIR, f))
          return { filename: f, url: `/uploads/${f}`, size: stat.size, createdAt: stat.birthtime.toISOString() }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      res.json({ data: images })
    } catch {
      res.status(500).json({ message: 'Failed to list images' })
    }
  })

  router.delete('/admin/images/:filename', authenticateToken, (req, res) => {
    try {
      const filePath = path.join(UPLOADS_DIR, req.params.filename)
      if (!filePath.startsWith(UPLOADS_DIR)) return res.status(403).json({ message: 'Invalid path' })
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' })
      fs.unlinkSync(filePath)
      res.json({ message: 'Image deleted' })
    } catch {
      res.status(500).json({ message: 'Failed to delete image' })
    }
  })

  return router
}
```

- [ ] **Step 3: Commit**

```bash
git add api/routes/site.ts api/routes/images.ts
git commit -m "refactor: extract site config and images route modules"
```

---

### Task 3.6: Rewrite api/index.ts as entry point

**Files:**
- Modify: `api/index.ts` (complete rewrite)

- [ ] **Step 1: Rewrite api/index.ts**

```ts
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { initDb, saveDb } from './db.js'
import { createAuthRouter } from './routes/auth.js'
import { createArticlesRouter } from './routes/articles.js'
import { createCategoriesRouter } from './routes/categories.js'
import { createTagsRouter } from './routes/tags.js'
import { createCommentsRouter } from './routes/comments.js'
import { createSiteRouter } from './routes/site.js'
import { createImagesRouter } from './routes/images.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')))

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: '评论提交过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

const { db } = await initDb()
const save = () => saveDb(db)

// Schema
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(50) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(30) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL, summary TEXT, coverImage VARCHAR(500),
    categoryId INTEGER NOT NULL, viewCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id)
  );
  CREATE TABLE IF NOT EXISTS article_tags (
    articleId INTEGER NOT NULL, tagId INTEGER NOT NULL,
    PRIMARY KEY (articleId, tagId),
    FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, articleId INTEGER NOT NULL,
    parentId INTEGER DEFAULT NULL, author VARCHAR(100) NOT NULL,
    email VARCHAR(200) DEFAULT '', content TEXT NOT NULL,
    isApproved INTEGER DEFAULT 0, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY, value TEXT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Init admin user
const existingUser = db.exec("SELECT id FROM users WHERE username = 'admin'")
if (existingUser.length === 0 || existingUser[0].values.length === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10)
  db.run("INSERT INTO users (username, password) VALUES ('admin', ?)", [hashedPassword])
  db.run("INSERT OR IGNORE INTO categories (name) VALUES ('技术')")
  db.run("INSERT OR IGNORE INTO categories (name) VALUES ('生活')")
  db.run("INSERT OR IGNORE INTO categories (name) VALUES ('随笔')")
  db.run("INSERT OR IGNORE INTO tags (name) VALUES ('Vue')")
  db.run("INSERT OR IGNORE INTO tags (name) VALUES ('TypeScript')")
  db.run("INSERT OR IGNORE INTO tags (name) VALUES ('Node.js')")
  db.run("INSERT OR IGNORE INTO tags (name) VALUES ('前端')")
  db.run("INSERT OR IGNORE INTO tags (name) VALUES ('思考')")
  save()
  console.log('初始化管理员账号和示例数据成功')
}

// Init default site config
const existingConfig = db.exec("SELECT value FROM site_config WHERE key = 'about'")
if (existingConfig.length === 0 || existingConfig[0].values.length === 0) {
  const defaultAbout = JSON.stringify({
    name: 'Your Name', role: 'Full Stack Developer', passion: 'Building cool things',
    bio: '欢迎来到我的个人博客！这里是我记录想法、分享技术心得的地方。\n我相信通过文字可以连接更多的人，也可以帮助自己更好地思考和成长。',
    philosophy: '这个博客使用 Vue 3 + TypeScript + Express 构建，采用现代化的技术栈，力求为用户提供流畅的阅读体验。',
    email: '954409711@qq.com', github: 'https://github.com/yzq745752',
  })
  db.run("INSERT INTO site_config (key, value) VALUES ('about', ?)", [defaultAbout])
  save()
}

// Mount routes
app.use('/api/auth', createAuthRouter(db))
app.use('/api/articles', createArticlesRouter(db))
app.use('/api/categories', createCategoriesRouter(db))
app.use('/api/tags', createTagsRouter(db))
app.use('/api', createCommentsRouter(db))
app.use('/api', createSiteRouter(db))
app.use('/api', createImagesRouter())

// Rate limiters applied after mounting
app.post('/api/auth/login', loginLimiter)
app.post('/api/articles/:id/comments', commentLimiter)

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Start server and run smoke test**

```bash
npx tsx api/index.ts &
sleep 2
curl http://localhost:3001/api/articles
curl http://localhost:3001/api/categories
curl http://localhost:3001/sitemap.xml
```

- [ ] **Step 3: Commit**

```bash
git add api/index.ts
git commit -m "refactor: rewrite api/index.ts as modular entry point"
```

---

### Task 4.1: Create useArticleList composable

**Files:**
- Create: `src/composables/useArticleList.ts`

- [ ] **Step 1: Create src/composables/useArticleList.ts**

```ts
import { ref } from 'vue'
import type { Article, ArticleListResponse } from '@/types'

interface UseArticleListOptions {
  perPage?: number
  fetchFn: (page: number, limit: number) => Promise<{ data: ArticleListResponse }>
}

export function useArticleList(options: UseArticleListOptions) {
  const { perPage = 9, fetchFn } = options

  const articles = ref<Article[]>([])
  const loading = ref(true)
  const loadingMore = ref(false)
  const page = ref(1)
  const totalArticles = ref(0)
  const totalPages = ref(1)

  const loadArticles = async (pageNum: number) => {
    loading.value = true
    page.value = pageNum
    try {
      const { data } = await fetchFn(pageNum, perPage)
      articles.value = data.data
      totalArticles.value = data.total
      totalPages.value = Math.ceil(data.total / perPage) || 1
    } finally {
      loading.value = false
    }
  }

  const loadMore = async () => {
    if (loadingMore.value || page.value >= totalPages.value) return
    loadingMore.value = true
    page.value++
    try {
      const { data } = await fetchFn(page.value, perPage)
      articles.value.push(...data.data)
      totalArticles.value = data.total
      totalPages.value = Math.ceil(data.total / perPage) || 1
    } finally {
      loadingMore.value = false
    }
  }

  const resetAndLoad = async () => {
    page.value = 1
    await loadArticles(1)
  }

  return { articles, loading, loadingMore, page, totalArticles, totalPages, loadArticles, loadMore, resetAndLoad }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useArticleList.ts
git commit -m "feat: add useArticleList composable for reusable pagination"
```

---

### Task 4.2: Update Tag.vue to use useArticleList

**Files:**
- Modify: `src/pages/Tag.vue`

- [ ] **Step 1: Refactor Tag.vue**

Replace the manual articles/loading/page/totalArticles state and loadArticles function with `useArticleList`. Show the key changes:

```ts
// Before (lines 1-50): manual state management + loadArticles
// After:
import { useArticleList } from '@/composables/useArticleList'
import { articleApi } from '@/api'

const tagName = ref(route.params.name as string)
const fetchFn = (page: number, limit: number) =>
  articleApi.getList(page, limit, { tag: tagName.value })

const { articles, loading, page, totalPages, loadArticles } = useArticleList({ fetchFn })

onMounted(() => loadArticles(1))
```

Template stays mostly the same — data bindings are identical.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Tag.vue
git commit -m "refactor: use useArticleList in Tag.vue"
```

---

### Task 4.3: Update Search.vue, Category.vue, Home.vue

**Files:**
- Modify: `src/pages/Search.vue`
- Modify: `src/pages/Category.vue`
- Modify: `src/pages/Home.vue`

- [ ] **Step 1: Update Search.vue to use useArticleList**

Replace manual pagination with `useArticleList({ fetchFn: (page, limit) => articleApi.getList(page, limit, { search: keyword.value }) })`.

- [ ] **Step 2: Update Category.vue to use useArticleList**

Replace manual pagination with `useArticleList({ fetchFn: (page, limit) => articleApi.getList(page, limit, { category: categoryName.value }) })`.

- [ ] **Step 3: Update Home.vue to use useArticleList**

Replace manual pagination with `useArticleList({ fetchFn: (page, limit) => articleApi.getList(page, limit) })`. Home.vue also has a `loadMore` feature — use `loadMore` from the composable.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Search.vue src/pages/Category.vue src/pages/Home.vue
git commit -m "refactor: use useArticleList in Search, Category, Home pages"
```

---

### Task 5.1: Add ESLint and Prettier

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
npm install --save-dev eslint @eslint/js typescript-eslint eslint-plugin-vue eslint-config-prettier prettier
```

- [ ] **Step 2: Create eslint.config.js**

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierConfig,
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    ignores: ['dist/**', 'data/**'],
  },
]
```

- [ ] **Step 3: Create .prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 4: Add scripts to package.json**

Add under `"scripts"`:
```json
"lint": "eslint .",
"format": "prettier --write ."
```

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js .prettierrc package.json package-lock.json
git commit -m "chore: add ESLint and Prettier config"
```

---

### Task 5.2: Fix Navbar login to use authStore instead of raw fetch

**Files:**
- Modify: `src/components/Navbar.vue`

- [ ] **Step 1: Replace raw fetch with authStore.login**

In `Navbar.vue`, replace the `handleLogin` function (around lines 36-57) from using raw `fetch('/api/auth/login', ...)` to:

```ts
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const handleLogin = async () => {
  loginError.value = ''
  loginLoading.value = true
  try {
    await authStore.login(loginUsername.value, loginPassword.value)
    loginUsername.value = ''
    loginPassword.value = ''
    showLoginModal.value = false
  } catch (err: any) {
    loginError.value = err?.response?.data?.message || '登录失败'
  } finally {
    loginLoading.value = false
  }
}
```

Remove the direct `fetch` call. The `authStore.login` already handles token storage and uses the Axios instance with interceptors.

- [ ] **Step 2: Commit**

```bash
git add src/components/Navbar.vue
git commit -m "fix: use authStore.login instead of raw fetch in Navbar"
```

---

### Task 5.3: Verify vue-tsc builds

**Files:**
- None (verification only)

- [ ] **Step 1: Run vue-tsc type check**

```bash
npx vue-tsc --noEmit --pretty 2>&1 | head -50
```

If errors remain, fix them by replacing remaining `any` usages with proper types.

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve vue-tsc type errors"
```

---

### Task 6.1: Remove content from article list API responses

**Files:**
- Modify: `api/routes/articles.ts` (the list query)

- [ ] **Step 1: Change SELECT to exclude content column**

In the `/` (list) route's SQL, change:
```sql
SELECT DISTINCT a.id, a.title, a.content, a.summary, a.coverImage, a.categoryId, a.viewCount, a.createdAt, a.updatedAt, c.name as categoryName
```
To:
```sql
SELECT DISTINCT a.id, a.title, a.summary, a.coverImage, a.categoryId, a.viewCount, a.createdAt, a.updatedAt, c.name as categoryName
```

Remove `a.content` from the SELECT.

- [ ] **Step 2: Commit**

```bash
git add api/routes/articles.ts
git commit -m "perf: exclude content field from article list API"
```

---

### Task 6.2: Add pagination limit cap

**Files:**
- Modify: `api/routes/articles.ts`
- Modify: `api/routes/comments.ts`

- [ ] **Step 1: Cap limit to 50**

In article list and admin comments list endpoints, change:
```ts
const limit = parseInt(req.query.limit as string) || 9
```
To:
```ts
const limit = Math.min(parseInt(req.query.limit as string) || 9, 50)
```

- [ ] **Step 2: Commit**

```bash
git add api/routes/articles.ts api/routes/comments.ts
git commit -m "fix: cap pagination limit to 50"
```

---

### Task 6.3: Fix Tag.vue CSS to use Tailwind theme classes

**Files:**
- Modify: `src/pages/Tag.vue`

- [ ] **Step 1: Replace old CSS classes**

Replace these CSS classes in Tag.vue's `<template>`:
- `text-text-dark` → `text-primary`
- `text-text-light` → `text-secondary`
- `font-serif` → keep (it's defined in Tailwind config)
- Any `bg-gray-200` → `bg-bg-elevated`
- `text-text-dim` should already be using the theme variable

Check the skeleton loading section: `bg-gray-200` → appropriate theme class like `bg-bg-elevated`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Tag.vue
git commit -m "style: fix Tag.vue to use consistent Tailwind theme classes"
```

---

### Task 6.4: Create .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```
# Required: JWT signing secret (use a long random string)
JWT_SECRET=change-me-to-a-random-secret

# Optional: Base URL for sitemap/RSS (defaults to http://localhost:3000)
BASE_URL=https://your-domain.com

# Optional: Server port (defaults to 3001)
PORT=3001
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example with required environment variables"
```

---

### Final Verification

- [ ] **Step 1: Run full test suite**

Start the server and make smoke-test requests:
```bash
npx tsx api/index.ts &
sleep 2
curl http://localhost:3001/api/articles | jq '.total'
curl http://localhost:3001/sitemap.xml | head -5
curl http://localhost:3001/rss.xml | head -5
curl -X POST http://localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'
```

- [ ] **Step 2: Run frontend dev build**

```bash
npm run dev &
sleep 3
curl http://localhost:3000 | head -20
```

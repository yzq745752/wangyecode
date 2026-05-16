import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { initDb, saveDb, parseRows, parseFirstRow } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}
const UPLOADS_DIR = path.join(__dirname, '../data/uploads')

// Ensure uploads directory exists
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持图片文件 (jpg, jpeg, png, gif, webp, svg)'))
    }
  },
})

app.use(cors())
app.use(express.json())

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

app.use('/uploads', express.static(UPLOADS_DIR))

const { db } = await initDb()
const save = () => saveDb(db)

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    coverImage VARCHAR(500),
    categoryId INTEGER NOT NULL,
    viewCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS article_tags (
    articleId INTEGER NOT NULL,
    tagId INTEGER NOT NULL,
    PRIMARY KEY (articleId, tagId),
    FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articleId INTEGER NOT NULL,
    parentId INTEGER DEFAULT NULL,
    author VARCHAR(100) NOT NULL,
    email VARCHAR(200) DEFAULT '',
    content TEXT NOT NULL,
    isApproved INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

const initAdmin = () => {
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
    console.log('用户名: admin')
    console.log('密码: admin123')
  }
}

initAdmin()

// Init default site config
const initConfig = () => {
  const existing = db.exec("SELECT value FROM site_config WHERE key = 'about'")
  if (existing.length === 0 || existing[0].values.length === 0) {
    const defaultAbout = JSON.stringify({
      name: 'Your Name',
      role: 'Full Stack Developer',
      passion: 'Building cool things',
      bio: '欢迎来到我的个人博客！这里是我记录想法、分享技术心得的地方。\n我相信通过文字可以连接更多的人，也可以帮助自己更好地思考和成长。',
      philosophy: '这个博客使用 Vue 3 + TypeScript + Express 构建，采用现代化的技术栈，力求为用户提供流畅的阅读体验。',
      email: '954409711@qq.com',
      github: 'https://github.com/yzq745752',
    })
    db.run("INSERT INTO site_config (key, value) VALUES ('about', ?)", [defaultAbout])
    save()
  }
}
initConfig()

const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

app.post('/api/auth/login', loginLimiter, (req, res) => {
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

  res.json({
    token,
    user: { id: userRow[0], username: userRow[1] },
  })
})

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  const user = (req as any).user
  res.json({ user })
})

app.post('/api/upload', authenticateToken, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件大小不能超过 5MB' })
      }
      return res.status(400).json({ message: err.message || '上传失败' })
    }
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片' })
    }
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    })
  })
})

app.get('/api/articles', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 9
  const category = req.query.category as string
  const tag = req.query.tag as string
  const search = req.query.search as string

  const offset = (page - 1) * limit

  let whereClauses: string[] = []
  const params: any[] = []

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
  
  if (tag) {
    countSql += ` LEFT JOIN article_tags at ON a.id = at.articleId LEFT JOIN tags t ON at.tagId = t.id`
  }
  
  countSql += whereSql
  const countResult = db.exec(countSql, params)
  const total = countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] as number : 0

  let sql = `
    SELECT DISTINCT a.id, a.title, a.content, a.summary, a.coverImage, a.categoryId, a.viewCount, a.createdAt, a.updatedAt, c.name as categoryName
    FROM articles a
    LEFT JOIN categories c ON a.categoryId = c.id
  `

  if (tag) {
    sql += `
      LEFT JOIN article_tags at ON a.id = at.articleId
      LEFT JOIN tags t ON at.tagId = t.id
    `
  }

  sql += whereSql
  sql += ` ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`

  params.push(limit, offset)

  const articlesResult = db.exec(sql, params)
  const articles: any[] = []

  if (articlesResult.length > 0) {
    const columns = articlesResult[0].columns
    for (const row of articlesResult[0].values) {
      const article: any = {}
      columns.forEach((col, idx) => {
        article[col] = row[idx]
      })
      articles.push(article)
    }
  }

  const articlesWithTags = articles.map((article) => {
    const tagsResult = db.exec(
      `SELECT t.id, t.name FROM tags t INNER JOIN article_tags at ON t.id = at.tagId WHERE at.articleId = ?`,
      [article.id]
    )

    const tags: any[] = []
    if (tagsResult.length > 0) {
      const tagColumns = tagsResult[0].columns
      for (const row of tagsResult[0].values) {
        const tag: any = {}
        tagColumns.forEach((col, idx) => {
          tag[col] = row[idx]
        })
        tags.push(tag)
      }
    }

    return {
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      coverImage: article.coverImage,
      categoryId: article.categoryId,
      category: { id: article.categoryId, name: article.categoryName },
      tags,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      viewCount: article.viewCount,
    }
  })

  res.json({
    data: articlesWithTags,
    total,
    page,
    limit,
  })
})

app.get('/api/articles/:id', (req, res) => {
  const id = parseInt(req.params.id)

  const result = db.exec(
    `SELECT a.id, a.title, a.content, a.summary, a.coverImage, a.categoryId, a.viewCount, a.createdAt, a.updatedAt, c.name as categoryName
     FROM articles a
     LEFT JOIN categories c ON a.categoryId = c.id
     WHERE a.id = ?`,
    [id]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(404).json({ message: '文章不存在' })
  }

  const columns = result[0].columns
  const row = result[0].values[0]
  const article: any = {}
  columns.forEach((col, idx) => {
    article[col] = row[idx]
  })

  db.run('UPDATE articles SET viewCount = viewCount + 1 WHERE id = ?', [id])
  save()

  const tagsResult = db.exec(
    `SELECT t.id, t.name FROM tags t INNER JOIN article_tags at ON t.id = at.tagId WHERE at.articleId = ?`,
    [id]
  )

  const tags: any[] = []
  if (tagsResult.length > 0) {
    const tagColumns = tagsResult[0].columns
    for (const tagRow of tagsResult[0].values) {
      const tag: any = {}
      tagColumns.forEach((col, idx) => {
        tag[col] = tagRow[idx]
      })
      tags.push(tag)
    }
  }

  res.json({
    data: {
      ...article,
      viewCount: article.viewCount,
      category: { id: article.categoryId, name: article.categoryName },
      tags,
    },
  })
})

// Related articles (same category or shared tags)
app.get('/api/articles/:id/related', (req, res) => {
  const id = parseInt(req.params.id)

  // Get current article's category and tags
  const article = db.exec('SELECT categoryId FROM articles WHERE id = ?', [id])
  if (article.length === 0 || article[0].values.length === 0) {
    return res.json({ data: [] })
  }

  const categoryId = article[0].values[0][0] as number

  const result = db.exec(
    `SELECT DISTINCT a.id, a.title, a.summary, a.coverImage, a.categoryId, a.createdAt, a.viewCount,
            c.name as categoryName,
            (SELECT COUNT(*) FROM article_tags WHERE articleId = a.id AND tagId IN (SELECT tagId FROM article_tags WHERE articleId = ?)) as tagMatchCount
     FROM articles a
     LEFT JOIN categories c ON a.categoryId = c.id
     LEFT JOIN article_tags at2 ON a.id = at2.articleId
     WHERE a.id != ?
       AND (a.categoryId = ? OR at2.tagId IN (SELECT tagId FROM article_tags WHERE articleId = ?))
     GROUP BY a.id
     ORDER BY
       CASE WHEN a.categoryId = ? THEN 1 ELSE 0 END + 0.1 * tagMatchCount DESC,
       a.createdAt DESC
     LIMIT 4`,
    [id, id, categoryId, id, categoryId]
  )

  const articles: any[] = []
  if (result.length > 0) {
    const columns = result[0].columns
    for (const row of result[0].values) {
      const articleRow: any = {}
      columns.forEach((col, idx) => { articleRow[col] = row[idx] })
      articles.push(articleRow)
    }
  }

  res.json({ data: articles })
})

app.post('/api/articles', authenticateToken, (req, res) => {
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

  const article = db.exec(`SELECT * FROM articles WHERE id = ?`, [articleId])
  res.status(201).json({ data: article.length > 0 ? article[0].values[0] : null })
})

app.put('/api/articles/:id', authenticateToken, (req, res) => {
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

  const article = db.exec('SELECT * FROM articles WHERE id = ?', [id])
  res.json({ data: article.length > 0 ? article[0].values[0] : null })
})

app.delete('/api/articles/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id)

  const existing = db.exec('SELECT id FROM articles WHERE id = ?', [id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ message: '文章不存在' })
  }

  db.run('DELETE FROM articles WHERE id = ?', [id])
  save()

  res.json({ message: '删除成功' })
})

// ── Comments ──────────────────────────────────────────

app.get('/api/articles/:id/comments', (req, res) => {
  const articleId = parseInt(req.params.id)

  const result = db.exec(
    `SELECT * FROM comments WHERE articleId = ? AND isApproved = 1 ORDER BY createdAt DESC`,
    [articleId]
  )

  const allComments: any[] = []
  if (result.length > 0) {
    const columns = result[0].columns
    for (const row of result[0].values) {
      const comment: any = {}
      columns.forEach((col, idx) => { comment[col] = row[idx] })
      allComments.push(comment)
    }
  }

  // Build nested tree: top-level comments have parentId = null
  const topLevel = allComments.filter((c: any) => !c.parentId)
  const replies = allComments.filter((c: any) => c.parentId)

  const nestReplies = (comment: any): any => {
    const childReplies = replies.filter((r: any) => r.parentId === comment.id)
    comment.replies = childReplies.map((r: any) => nestReplies(r))
    return comment
  }

  res.json({ data: topLevel.map(nestReplies) })
})

app.post('/api/articles/:id/comments', commentLimiter, (req, res) => {
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

// Admin: list all comments
app.get('/api/admin/comments', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const offset = (page - 1) * limit

  const countResult = db.exec('SELECT COUNT(*) FROM comments')
  const total = countResult.length > 0 ? countResult[0].values[0][0] as number : 0

  const result = db.exec(
    `SELECT c.id, c.articleId, c.parentId, c.author, c.email, c.content, c.isApproved, c.createdAt, a.title as articleTitle
     FROM comments c
     LEFT JOIN articles a ON c.articleId = a.id
     ORDER BY c.createdAt DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  )

  const comments: any[] = []
  if (result.length > 0) {
    const columns = result[0].columns
    for (const row of result[0].values) {
      const comment: any = {}
      columns.forEach((col, idx) => { comment[col] = row[idx] })
      comments.push(comment)
    }
  }

  res.json({ data: comments, total, page, limit })
})

// Admin: approve/reject comment
app.put('/api/admin/comments/:id/approve', authenticateToken, (req, res) => {
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

// Admin: delete comment
app.delete('/api/admin/comments/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id)

  const existing = db.exec('SELECT id FROM comments WHERE id = ?', [id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ message: '评论不存在' })
  }

  db.run('DELETE FROM comments WHERE id = ? OR parentId = ?', [id, id])
  save()

  res.json({ message: '删除成功' })
})

app.get('/api/categories', (req, res) => {
  const result = db.exec(`
    SELECT c.id, c.name, c.createdAt, COUNT(a.id) as articleCount
    FROM categories c
    LEFT JOIN articles a ON c.id = a.categoryId
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `)

  const categories: any[] = []
  if (result.length > 0) {
    const columns = result[0].columns
    for (const row of result[0].values) {
      const cat: any = {}
      columns.forEach((col, idx) => {
        cat[col] = row[idx]
      })
      categories.push(cat)
    }
  }

  res.json({ data: categories })
})

app.post('/api/categories', authenticateToken, (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: '分类名称不能为空' })
  }

  try {
    db.run('INSERT INTO categories (name) VALUES (?)', [name])
    save()
    const result = db.exec('SELECT * FROM categories WHERE name = ?', [name])
    res.status(201).json({ data: result.length > 0 ? result[0].values[0] : null })
  } catch {
    res.status(400).json({ message: '分类名称已存在' })
  }
})

app.put('/api/categories/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id)
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: '分类名称不能为空' })
  }

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

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
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

app.get('/api/tags', (req, res) => {
  const result = db.exec(`
    SELECT t.id, t.name, t.createdAt, COUNT(at.articleId) as articleCount
    FROM tags t
    LEFT JOIN article_tags at ON t.id = at.tagId
    GROUP BY t.id
    ORDER BY t.createdAt DESC
  `)

  const tags: any[] = []
  if (result.length > 0) {
    const columns = result[0].columns
    for (const row of result[0].values) {
      const tag: any = {}
      columns.forEach((col, idx) => {
        tag[col] = row[idx]
      })
      tags.push(tag)
    }
  }

  res.json({ data: tags })
})

app.post('/api/tags', authenticateToken, (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: '标签名称不能为空' })
  }

  try {
    db.run('INSERT INTO tags (name) VALUES (?)', [name])
    save()
    const result = db.exec('SELECT * FROM tags WHERE name = ?', [name])
    res.status(201).json({ data: result.length > 0 ? result[0].values[0] : null })
  } catch {
    res.status(400).json({ message: '标签名称已存在' })
  }
})

app.put('/api/tags/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id)
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ message: '标签名称不能为空' })
  }

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

app.delete('/api/tags/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id)

  const existing = db.exec('SELECT id FROM tags WHERE id = ?', [id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ message: '标签不存在' })
  }

  db.run('DELETE FROM tags WHERE id = ?', [id])
  save()

  res.json({ message: '删除成功' })
})

// About page config (public)
app.get('/api/config/about', (_req, res) => {
  const result = db.exec("SELECT value FROM site_config WHERE key = 'about'")
  if (result.length === 0 || result[0].values.length === 0) {
    return res.json({ data: null })
  }
  try {
    res.json({ data: JSON.parse(result[0].values[0] as string) })
  } catch {
    res.json({ data: null })
  }
})

// Update about config (admin)
app.put('/api/config/about', authenticateToken, (req, res) => {
  const { name, role, passion, bio, philosophy, email, github } = req.body
  const value = JSON.stringify({ name, role, passion, bio, philosophy, email, github })
  db.run("INSERT OR REPLACE INTO site_config (key, value, updatedAt) VALUES ('about', ?, ?)", [value, new Date().toISOString()])
  save()
  res.json({ message: '保存成功' })
})

// Change password (admin)
app.put('/api/auth/password', authenticateToken, (req, res) => {
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

// Sitemap
app.get('/sitemap.xml', (req, res) => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  const articles = db.exec(
    'SELECT id, title, updatedAt FROM articles ORDER BY updatedAt DESC'
  )

  let urls = `
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`

  if (articles.length > 0) {
    for (const row of articles[0].values) {
      const [id, _title, updatedAt] = row
      const lastmod = updatedAt ? new Date(updatedAt as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      urls += `
  <url>
    <loc>${BASE_URL}/article/${id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  res.set('Content-Type', 'application/xml')
  res.send(xml)
})

// RSS Feed
app.get('/rss.xml', (req, res) => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  const articles = db.exec(
    `SELECT a.id, a.title, a.summary, a.content, a.createdAt, c.name as categoryName
     FROM articles a
     LEFT JOIN categories c ON a.categoryId = c.id
     ORDER BY a.createdAt DESC LIMIT 20`
  )

  let items = ''
  if (articles.length > 0) {
    const columns = articles[0].columns
    for (const row of articles[0].values) {
      const item: any = {}
      columns.forEach((col, idx) => { item[col] = row[idx] })
      const pubDate = new Date(item.createdAt).toUTCString()
      const description = item.summary
        ? escapeXml(item.summary)
        : escapeXml(item.content.replace(/<[^>]*>/g, '').slice(0, 300))

      items += `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${BASE_URL}/article/${item.id}</link>
    <guid>${BASE_URL}/article/${item.id}</guid>
    <description>${description}</description>
    <category>${escapeXml(item.categoryName || '')}</category>
    <pubDate>${pubDate}</pubDate>
  </item>
`
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>个人博客</title>
    <link>${BASE_URL}</link>
    <description>分享技术、记录生活</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}  </channel>
</rss>`

  res.set('Content-Type', 'application/rss+xml; charset=utf-8')
  res.send(xml)
})

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// Data export
app.get('/api/admin/export', authenticateToken, (req, res) => {
  try {
    const categories = db.exec('SELECT * FROM categories ORDER BY id')
    const tags = db.exec('SELECT * FROM tags ORDER BY id')
    const articles = db.exec(`
      SELECT a.*, c.name as categoryName FROM articles a
      LEFT JOIN categories c ON a.categoryId = c.id ORDER BY a.id
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
  } catch (e) {
    res.status(500).json({ message: 'Export failed' })
  }
})

// Image management
app.get('/api/admin/images', authenticateToken, (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(UPLOADS_DIR, f))
        return {
          filename: f,
          url: `/uploads/${f}`,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json({ data: images })
  } catch (e) {
    res.status(500).json({ message: 'Failed to list images' })
  }
})

app.delete('/api/admin/images/:filename', authenticateToken, (req, res) => {
  try {
    const filePath = path.join(UPLOADS_DIR, req.params.filename)
    // Prevent path traversal
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({ message: 'Invalid path' })
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' })
    }
    fs.unlinkSync(filePath)
    res.json({ message: 'Image deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete image' })
  }
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})

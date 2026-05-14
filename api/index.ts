import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const JWT_SECRET = 'blog-jwt-secret-key-2024'
const DB_PATH = path.join(__dirname, '../data/blog.db')
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
app.use('/uploads', express.static(UPLOADS_DIR))

const SqlJs = await initSqlJs()

let db: SqlJs.Database

if (fs.existsSync(DB_PATH)) {
  const buffer = fs.readFileSync(DB_PATH)
  db = new SqlJs.Database(buffer)
} else {
  db = new SqlJs.Database()
}

const saveDb = () => {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  }
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

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

    saveDb()
    console.log('初始化管理员账号和示例数据成功')
    console.log('用户名: admin')
    console.log('密码: admin123')
  }
}

initAdmin()

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

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' })
  }

  const result = db.exec("SELECT * FROM users WHERE username = '" + username.replace(/'/g, "''") + "'")
  
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
  saveDb()

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
      viewCount: (article.viewCount as number) + 1,
      category: { id: article.categoryId, name: article.categoryName },
      tags,
    },
  })
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

  saveDb()

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

  saveDb()

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
  saveDb()

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
    saveDb()
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
    saveDb()
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
  saveDb()

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
    saveDb()
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
    saveDb()
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
  saveDb()

  res.json({ message: '删除成功' })
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})

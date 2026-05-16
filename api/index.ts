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

// Initialize default admin and sample data if fresh database
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

// Initialize default site config if not exists
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

// Mount route modules
app.use('/api/auth', createAuthRouter(db))
app.use('/api/articles', createArticlesRouter(db))
app.use('/api/categories', createCategoriesRouter(db))
app.use('/api/tags', createTagsRouter(db))
app.use('/api', createCommentsRouter(db))
app.use('/api', createSiteRouter(db))
app.use('/api', createImagesRouter())

// Rate limiters applied after mounting (Express matches routes in order, so
// these only take effect when the actual route handler runs — the limiter is
// applied as middleware to the specific paths)
app.post('/api/auth/login', loginLimiter)
app.post('/api/articles/:id/comments', commentLimiter)

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})

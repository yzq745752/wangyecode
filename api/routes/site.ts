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

  // Data export (admin)
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

export function createSitemapRouter(db: SqlJs.Database) {
  const router = Router()

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

  return router
}

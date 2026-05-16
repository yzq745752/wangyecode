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

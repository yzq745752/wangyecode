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

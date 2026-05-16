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

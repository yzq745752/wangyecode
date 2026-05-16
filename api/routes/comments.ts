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
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
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

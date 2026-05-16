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

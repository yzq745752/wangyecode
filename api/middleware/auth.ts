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

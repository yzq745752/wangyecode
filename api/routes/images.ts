import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authenticateToken } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOADS_DIR = path.join(__dirname, '../../data/uploads')

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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('仅支持图片文件 (jpg, jpeg, png, gif, webp, svg)'))
  },
})

export function createImagesRouter() {
  const router = Router()

  router.post('/upload', authenticateToken, (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: '文件大小不能超过 5MB' })
        }
        return res.status(400).json({ message: err.message || '上传失败' })
      }
      if (!req.file) return res.status(400).json({ message: '请选择图片' })
      res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename })
    })
  })

  router.get('/admin/images', authenticateToken, (_req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR)
      const images = files
        .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
        .map(f => {
          const stat = fs.statSync(path.join(UPLOADS_DIR, f))
          return { filename: f, url: `/uploads/${f}`, size: stat.size, createdAt: stat.birthtime.toISOString() }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      res.json({ data: images })
    } catch {
      res.status(500).json({ message: 'Failed to list images' })
    }
  })

  router.delete('/admin/images/:filename', authenticateToken, (req, res) => {
    try {
      const filePath = path.join(UPLOADS_DIR, req.params.filename)
      if (!filePath.startsWith(UPLOADS_DIR)) return res.status(403).json({ message: 'Invalid path' })
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' })
      fs.unlinkSync(filePath)
      res.json({ message: 'Image deleted' })
    } catch {
      res.status(500).json({ message: 'Failed to delete image' })
    }
  })

  return router
}

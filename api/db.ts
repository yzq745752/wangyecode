import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '../data/blog.db')

export async function initDb() {
  const SqlJs = await initSqlJs()

  let db: SqlJs.Database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SqlJs.Database(buffer)
  } else {
    db = new SqlJs.Database()
  }

  return { db, SqlJs }
}

export function saveDb(db: SqlJs.Database) {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  }
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

export function parseRows<T>(result: SqlJs.QueryExecResult[]): T[] {
  if (result.length === 0 || !result[0].values) return []
  const { columns, values } = result[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, idx) => { obj[col] = row[idx] })
    return obj as T
  })
}

export function parseFirstRow<T>(result: SqlJs.QueryExecResult[]): T | null {
  const rows = parseRows<T>(result)
  return rows.length > 0 ? rows[0] : null
}

export { DB_PATH }

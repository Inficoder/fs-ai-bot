import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { MIGRATIONS, SCHEMA_SQL } from './schema.js'

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'feishu_ai.db')

let _db: SqlJsDatabase | null = null
let _ready: Promise<SqlJsDatabase> | null = null

function loadFromDisk(): Buffer | null {
  try {
    return fs.readFileSync(DB_PATH)
  } catch {
    return null
  }
}

export function saveToDisk(db: SqlJsDatabase): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

/** 同步执行 SQL，自动保存到磁盘 */
export function exec(sql: string): SqlJsDatabase {
  const db = getDb()
  db.exec(sql)
  saveToDisk(db)
  return db
}

/** 执行查询，返回行数组 */
export function queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const db = getDb()
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

/** 执行单行查询 */
export function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
  const rows = queryAll<T>(sql, params)
  return rows[0] ?? null
}

/** 执行写操作 (INSERT/UPDATE/DELETE)，返回受影响的 row count */
export function execute(sql: string, params: unknown[] = []): number {
  const db = getDb()
  db.run(sql, params)
  const changes = db.getRowsModified()
  saveToDisk(db)
  return changes
}

/** 执行 INSERT，返回 last insert rowid */
export function insert(sql: string, params: unknown[] = []): number {
  const db = getDb()
  db.run(sql, params)
  const rowId = Number(db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] ?? 0)
  saveToDisk(db)
  return rowId
}

export function getDb(): SqlJsDatabase {
  if (!_db) throw new Error('数据库未初始化，请先调用 initDb()')
  return _db
}

export async function initDb(): Promise<SqlJsDatabase> {
  if (_ready) return _ready

  _ready = (async () => {
    const SQL = await initSqlJs()
    const existing = loadFromDisk()
    _db = existing
      ? new SQL.Database(existing)
      : new SQL.Database()

    _db.run('PRAGMA foreign_keys = ON')
    _db.run(SCHEMA_SQL)
    for (const migration of MIGRATIONS) {
      try { _db.exec(migration) } catch { /* column already exists */ }
    }
    saveToDisk(_db)
    return _db
  })()

  return _ready
}

export function closeDb(): void {
  if (_db) {
    saveToDisk(_db)
    _db.close()
    _db = null
  }
  _ready = null
}

export { DB_PATH, DATA_DIR }

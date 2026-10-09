import { createClient } from '@libsql/client';

/**
 * libSQL = SQLite, который работает и как локальный файл, и как облако (Turso).
 * TURSO_DATABASE_URL пуст → file:./verity.db (для разработки).
 * На бесплатном Render файловая система стирается при каждом засыпании,
 * поэтому в облаке история хранится в Turso.
 */
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./verity.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

await db.batch(
  [
    `CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY,
       first_name TEXT,
       first_seen INTEGER NOT NULL,
       last_active INTEGER NOT NULL
     )`,
    `CREATE TABLE IF NOT EXISTS messages (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       role TEXT NOT NULL CHECK (role IN ('user','assistant')),
       content TEXT NOT NULL,
       state TEXT,
       timestamp INTEGER NOT NULL
     )`,
    'CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_id, id)',
  ],
  'write'
);

export async function getUser(id) {
  const r = await db.execute({ sql: 'SELECT id, first_name, first_seen, last_active FROM users WHERE id = ?', args: [id] });
  return r.rows[0] ?? null;
}

export async function touchUser(id, name, now) {
  await db.execute({
    sql: `INSERT INTO users (id, first_name, first_seen, last_active) VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_active = excluded.last_active`,
    args: [id, name, now, now],
  });
}

export async function addMessage(userId, role, content, state, ts) {
  await db.execute({
    sql: 'INSERT INTO messages (user_id, role, content, state, timestamp) VALUES (?, ?, ?, ?, ?)',
    args: [userId, role, content, state ?? null, ts],
  });
}

/** Последние n сообщений в хронологическом порядке */
export async function lastMessages(userId, n) {
  const r = await db.execute({
    sql: 'SELECT role, content, state, timestamp FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    args: [userId, n],
  });
  return r.rows
    .map((x) => ({ role: x.role, content: x.content, state: x.state, timestamp: Number(x.timestamp) }))
    .reverse();
}

export async function lastUserTexts(userId, n) {
  const r = await db.execute({
    sql: "SELECT content FROM messages WHERE user_id = ? AND role = 'user' ORDER BY id DESC LIMIT ?",
    args: [userId, n],
  });
  return r.rows.map((x) => String(x.content));
}

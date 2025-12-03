import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mikrotik-monitor.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    port INTEGER DEFAULT 8728,
    status TEXT DEFAULT 'disconnected',
    last_connected DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    topics TEXT,
    time DATETIME,
    severity TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    first_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified INTEGER DEFAULT 0,
    resolved INTEGER DEFAULT 0,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_logs_node_id ON logs(node_id);
  CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_alerts_node_id ON alerts(node_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
`);

export interface Node {
  id?: number;
  name: string;
  ip: string;
  username: string;
  password: string;
  port?: number;
  status?: string;
  last_connected?: string;
  created_at?: string;
}

export interface Log {
  id?: number;
  node_id: number;
  message: string;
  topics?: string;
  time?: string;
  severity?: string;
  created_at?: string;
}

export interface Alert {
  id?: number;
  node_id: number;
  type: string;
  message: string;
  severity: string;
  count?: number;
  first_occurrence?: string;
  last_occurrence?: string;
  notified?: number;
  resolved?: number;
}

export interface Setting {
  id?: number;
  key: string;
  value: string;
  updated_at?: string;
}

// Node operations
export const nodeOperations = {
  create: (node: Node) => {
    const stmt = db.prepare(`
      INSERT INTO nodes (name, ip, username, password, port)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(node.name, node.ip, node.username, node.password, node.port || 8728);
    return result.lastInsertRowid;
  },

  getAll: () => {
    const stmt = db.prepare('SELECT * FROM nodes ORDER BY created_at DESC');
    return stmt.all() as Node[];
  },

  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM nodes WHERE id = ?');
    return stmt.get(id) as Node | undefined;
  },

  update: (id: number, node: Partial<Node>) => {
    const fields: string[] = [];
    const values: any[] = [];

    if (node.name !== undefined) { fields.push('name = ?'); values.push(node.name); }
    if (node.ip !== undefined) { fields.push('ip = ?'); values.push(node.ip); }
    if (node.username !== undefined) { fields.push('username = ?'); values.push(node.username); }
    if (node.password !== undefined) { fields.push('password = ?'); values.push(node.password); }
    if (node.port !== undefined) { fields.push('port = ?'); values.push(node.port); }
    if (node.status !== undefined) { fields.push('status = ?'); values.push(node.status); }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = db.prepare(`UPDATE nodes SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  },

  updateStatus: (id: number, status: string) => {
    const stmt = db.prepare('UPDATE nodes SET status = ?, last_connected = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM nodes WHERE id = ?');
    stmt.run(id);
  }
};

// Log operations
export const logOperations = {
  create: (log: Log) => {
    const stmt = db.prepare(`
      INSERT INTO logs (node_id, message, topics, time, severity)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(log.node_id, log.message, log.topics, log.time, log.severity);
    return result.lastInsertRowid;
  },

  getByNodeId: (nodeId: number, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM logs
      WHERE node_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(nodeId, limit) as Log[];
  },

  getRecent: (limit = 100) => {
    const stmt = db.prepare(`
      SELECT l.*, n.name as node_name
      FROM logs l
      JOIN nodes n ON l.node_id = n.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  deleteOld: (days = 30) => {
    const stmt = db.prepare(`
      DELETE FROM logs
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    stmt.run(days);
  }
};

// Alert operations
export const alertOperations = {
  create: (alert: Alert) => {
    const stmt = db.prepare(`
      INSERT INTO alerts (node_id, type, message, severity, count)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(alert.node_id, alert.type, alert.message, alert.severity, alert.count || 1);
    return result.lastInsertRowid;
  },

  getActive: (): (Alert & { node_name: string })[] => {
    const stmt = db.prepare(`
      SELECT a.*, n.name as node_name
      FROM alerts a
      JOIN nodes n ON a.node_id = n.id
      WHERE a.resolved = 0
      ORDER BY a.last_occurrence DESC
    `);
    return stmt.all() as (Alert & { node_name: string })[];
  },

  getByNodeId: (nodeId: number): Alert[] => {
    const stmt = db.prepare(`
      SELECT * FROM alerts
      WHERE node_id = ? AND resolved = 0
      ORDER BY last_occurrence DESC
    `);
    return stmt.all(nodeId) as Alert[];
  },

  increment: (id: number) => {
    const stmt = db.prepare(`
      UPDATE alerts
      SET count = count + 1, last_occurrence = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  },

  markNotified: (id: number) => {
    const stmt = db.prepare('UPDATE alerts SET notified = 1 WHERE id = ?');
    stmt.run(id);
  },

  resolve: (id: number) => {
    const stmt = db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?');
    stmt.run(id);
  },

  findSimilar: (nodeId: number, type: string, message: string) => {
    const stmt = db.prepare(`
      SELECT * FROM alerts
      WHERE node_id = ? AND type = ? AND message = ? AND resolved = 0
      LIMIT 1
    `);
    return stmt.get(nodeId, type, message) as Alert | undefined;
  }
};

// Settings operations
export const settingsOperations = {
  get: (key: string) => {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as Setting | undefined;
    return result?.value;
  },

  set: (key: string, value: string) => {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value, value);
  },

  getAll: () => {
    const stmt = db.prepare('SELECT * FROM settings');
    return stmt.all() as Setting[];
  }
};

export default db;

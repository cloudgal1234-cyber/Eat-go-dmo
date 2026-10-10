import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { seed } from './seed';

// Demo restaurant is in Israel; keep "today" and opening hours right on UTC servers
process.env.TZ = process.env.TZ || 'Asia/Jerusalem';

// On Vercel the project dir is read-only; /tmp is the only writable place
const DB_DIR = process.env.VERCEL ? '/tmp/aetgo' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'aetgo.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY, name TEXT, category TEXT, description TEXT, ingredients TEXT,
  price REAL, vegetarian INTEGER, vegan INTEGER, gluten_free INTEGER, allergens TEXT,
  spicy INTEGER DEFAULT 0, popular INTEGER DEFAULT 0, emoji TEXT, active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tables (number INTEGER PRIMARY KEY, seats INTEGER, area TEXT);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY, table_number INTEGER, opened_at INTEGER, closed_at INTEGER,
  status TEXT, opened_by TEXT, guests INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS diners (
  id INTEGER PRIMARY KEY, session_id INTEGER, name TEXT, device_id TEXT, member_id INTEGER,
  joined_at INTEGER, feedback INTEGER
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, kind TEXT, session_id INTEGER, table_number INTEGER, status TEXT,
  created_at INTEGER, ready_at INTEGER, customer_name TEXT, phone TEXT, address TEXT,
  courier_id INTEGER, delivery_status TEXT, paid INTEGER DEFAULT 0, pay_method TEXT,
  total REAL DEFAULT 0, note TEXT, plan_code TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY, order_id INTEGER, menu_item_id INTEGER, name TEXT, price REAL,
  qty INTEGER, diner_id INTEGER, note TEXT
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, session_id INTEGER, order_id INTEGER, diner_id INTEGER, amount REAL,
  tip REAL DEFAULT 0, method TEXT, mode TEXT, created_at INTEGER, source TEXT
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY, name TEXT, phone TEXT, email TEXT, points INTEGER DEFAULT 0,
  tier TEXT, allergies TEXT, birthday TEXT, anniversary TEXT, marketing INTEGER, location INTEGER,
  distance_km REAL, joined_at INTEGER, visits INTEGER DEFAULT 0, notes TEXT, last_items TEXT
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY, kind TEXT, table_number INTEGER, message TEXT, created_at INTEGER,
  seen INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY, session_id INTEGER, diner_id INTEGER, table_number INTEGER,
  score INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY, name TEXT, role TEXT, rate REAL, color TEXT);
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY, staff_id INTEGER, weekday INTEGER, start TEXT, end TEXT
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY, staff_id INTEGER, date TEXT, clock_in INTEGER, clock_out INTEGER,
  late_min INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY, name TEXT, contact TEXT, phone TEXT, category TEXT, lead_days INTEGER
);
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY, name TEXT, unit TEXT, qty REAL, min_qty REAL, supplier_id INTEGER,
  cost REAL, alerted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS recipes (menu_item_id INTEGER, inventory_id INTEGER, qty REAL);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY, supplier_id INTEGER, inventory_id INTEGER, qty REAL, status TEXT,
  created_at INTEGER, received_at INTEGER, source TEXT
);
CREATE TABLE IF NOT EXISTS couriers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, vehicle TEXT);
CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY, title TEXT, host TEXT, scheduled_at INTEGER, table_number INTEGER,
  status TEXT, guests_expected INTEGER, created_at INTEGER, order_id INTEGER
);
CREATE TABLE IF NOT EXISTS plan_participants (
  id INTEGER PRIMARY KEY, plan_code TEXT, name TEXT, menu_item_id INTEGER, paid INTEGER,
  method TEXT, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY, title TEXT, offer TEXT, recipients INTEGER, radius REAL, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS owner_chat (id INTEGER PRIMARY KEY, sender TEXT, text TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS day_closures (
  id INTEGER PRIMARY KEY, closed_at INTEGER, from_ts INTEGER, total REAL, orders_count INTEGER,
  by_method TEXT
);
`;

const ALL_TABLES = [
  'settings', 'menu_items', 'tables', 'sessions', 'diners', 'orders', 'order_items', 'payments',
  'members', 'alerts', 'feedback', 'staff', 'shifts', 'attendance', 'suppliers', 'inventory',
  'recipes', 'purchase_orders', 'couriers', 'plans', 'plan_participants', 'campaigns',
  'owner_chat', 'day_closures',
];

type G = typeof globalThis & { __aetgoDb?: Database.Database };
const g = globalThis as G;

export function db(): Database.Database {
  if (g.__aetgoDb) return g.__aetgoDb;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const conn = new Database(DB_FILE);
  conn.pragma('journal_mode = WAL');
  conn.exec(SCHEMA);
  const has = conn.prepare('SELECT COUNT(*) AS c FROM menu_items').get() as { c: number };
  if (has.c === 0) conn.transaction(() => seed(conn))();
  g.__aetgoDb = conn;
  return conn;
}

export function resetDb() {
  const conn = db();
  conn.transaction(() => {
    for (const t of ALL_TABLES) conn.exec(`DELETE FROM ${t}`);
    seed(conn);
  })();
}

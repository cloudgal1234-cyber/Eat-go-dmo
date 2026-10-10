import { db, resetDb } from './db';
import { startOfDay, ymd } from './seed';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const round2 = (n: number) => Math.round(n * 100) / 100;

export class UserError extends Error {}

function all(sql: string, ...p: any[]): Row[] {
  return db().prepare(sql).all(...p) as Row[];
}
function one(sql: string, ...p: any[]): Row | undefined {
  return db().prepare(sql).get(...p) as Row | undefined;
}
function run(sql: string, ...p: any[]) {
  return db().prepare(sql).run(...p);
}

/* ---------------------------------------------------------------- basics */

export function getSettings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of all('SELECT key, value FROM settings')) out[r.key] = r.value;
  return out;
}

export function getMenu(): Row[] {
  return all('SELECT * FROM menu_items WHERE active = 1 ORDER BY id').map((m) => ({
    ...m,
    vegetarian: !!m.vegetarian,
    vegan: !!m.vegan,
    gluten_free: !!m.gluten_free,
    popular: !!m.popular,
    spicy: !!m.spicy,
    allergens: m.allergens ? String(m.allergens).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
  }));
}

function addAlert(kind: string, message: string, table: number | null = null) {
  run('INSERT INTO alerts (kind, table_number, message, created_at) VALUES (?, ?, ?, ?)', kind, table, message, Date.now());
}

function deductInventory(orderId: number) {
  const usage = all(
    `SELECT r.inventory_id, SUM(r.qty * oi.qty) AS used FROM order_items oi
     JOIN recipes r ON r.menu_item_id = oi.menu_item_id WHERE oi.order_id = ? GROUP BY r.inventory_id`,
    orderId,
  );
  for (const u of usage) run('UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ?', u.used, u.inventory_id);
  for (const it of all('SELECT * FROM inventory WHERE qty < min_qty AND alerted = 0')) {
    addAlert('stock', `מלאי נמוך: ${it.name} (${fmtQty(it.qty)} ${it.unit} / מינימום ${fmtQty(it.min_qty)})`);
    run('UPDATE inventory SET alerted = 1 WHERE id = ?', it.id);
  }
}
const fmtQty = (n: number) => String(Math.round(n * 10) / 10);

type LineIn = { menuItemId: number; qty: number; dinerId?: number | null; note?: string };

function createOrder(o: {
  kind: string; sessionId?: number | null; table?: number | null; items: LineIn[]; status?: string;
  customerName?: string; phone?: string; address?: string; paid?: boolean; method?: string; note?: string;
  deliveryStatus?: string | null; planCode?: string;
}) {
  if (!o.items.length) throw new UserError('ההזמנה ריקה');
  const menu = new Map(getMenu().map((m) => [m.id, m]));
  let total = 0;
  for (const l of o.items) {
    const m = menu.get(Number(l.menuItemId));
    if (!m) throw new UserError('מנה לא קיימת');
    total += m.price * Math.max(1, Number(l.qty) || 1);
  }
  const res = run(
    `INSERT INTO orders (kind, session_id, table_number, status, created_at, customer_name, phone, address, delivery_status, paid, pay_method, total, note, plan_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    o.kind, o.sessionId ?? null, o.table ?? null, o.status ?? 'new', Date.now(), o.customerName ?? null, o.phone ?? null,
    o.address ?? null, o.deliveryStatus ?? null, o.paid ? 1 : 0, o.method ?? null, total, o.note ?? null, o.planCode ?? null,
  );
  const orderId = Number(res.lastInsertRowid);
  for (const l of o.items) {
    const m = menu.get(Number(l.menuItemId))!;
    run('INSERT INTO order_items (order_id, menu_item_id, name, price, qty, diner_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      orderId, m.id, m.name, m.price, Math.max(1, Number(l.qty) || 1), l.dinerId ?? null, l.note ?? null);
  }
  deductInventory(orderId);
  return orderId;
}

function orderWithItems(o: Row) {
  return { ...o, items: all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', o.id) };
}

/* ---------------------------------------------------------------- scheduler */

export function tick() {
  const due = all("SELECT * FROM plans WHERE status = 'collecting' AND scheduled_at <= ?", Date.now());
  for (const p of due) sendPlanToKitchen(p.code);
}

function sendPlanToKitchen(code: string) {
  const p = one('SELECT * FROM plans WHERE code = ?', code);
  if (!p || p.status !== 'collecting') return;
  const parts = all('SELECT * FROM plan_participants WHERE plan_code = ? AND paid = 1', code);
  if (!parts.length) {
    run("UPDATE plans SET status = 'sent' WHERE code = ?", code);
    return;
  }
  const orderId = createOrder({
    kind: 'plan', table: p.table_number, planCode: code, paid: true, method: 'prepaid',
    customerName: p.title, items: parts.map((x) => ({ menuItemId: x.menu_item_id, qty: 1 })),
    note: parts.map((x) => x.name).join(', '),
  });
  run("UPDATE plans SET status = 'sent', order_id = ? WHERE code = ?", orderId, code);
}

/* ---------------------------------------------------------------- table sessions & bill */

function openSessionFor(table: number) {
  return one("SELECT * FROM sessions WHERE table_number = ? AND status = 'open' ORDER BY id DESC LIMIT 1", table);
}

export function computeBill(sessionId: number) {
  const session = one('SELECT * FROM sessions WHERE id = ?', sessionId)!;
  const diners = all('SELECT * FROM diners WHERE session_id = ? ORDER BY id', sessionId);
  const orders = all('SELECT * FROM orders WHERE session_id = ? ORDER BY id', sessionId).map(orderWithItems);
  const payments = all('SELECT * FROM payments WHERE session_id = ? ORDER BY id', sessionId);
  const total = round2(orders.reduce((s, o) => s + o.items.reduce((a: number, i: Row) => a + i.price * i.qty, 0), 0));
  const paid = round2(payments.reduce((s, p) => s + p.amount, 0));
  const tips = round2(payments.reduce((s, p) => s + (p.tip || 0), 0));
  const divisor = Math.max(diners.length, session.guests || 0, 1);
  const remaining = round2(Math.max(0, total - paid));
  const perDiner = diners.map((d) => {
    const ordered = round2(orders.reduce((s, o) => s + o.items.filter((i: Row) => i.diner_id === d.id).reduce((a: number, i: Row) => a + i.price * i.qty, 0), 0));
    const dPaid = round2(payments.filter((p) => p.diner_id === d.id).reduce((s, p) => s + p.amount, 0));
    return {
      dinerId: d.id, name: d.name, memberId: d.member_id, ordered, paid: dPaid, feedback: d.feedback,
      mine: round2(Math.min(remaining, Math.max(0, ordered - dPaid))),
      equal: round2(Math.min(remaining, Math.max(0, total / divisor - dPaid))),
    };
  });
  const shared = round2(orders.reduce((s, o) => s + o.items.filter((i: Row) => !i.diner_id).reduce((a: number, i: Row) => a + i.price * i.qty, 0), 0));
  return { session, diners, orders, payments, total, paid, tips, remaining, divisor, equalShare: round2(total / divisor), perDiner, shared };
}

function tableStatus(table: number) {
  const s = openSessionFor(table);
  if (!s) {
    const plan = one("SELECT * FROM plans WHERE table_number = ? AND status = 'collecting' AND scheduled_at < ?", table, startOfDay() + DAY);
    return { status: plan ? 'reserved' : 'free', plan };
  }
  const orders = all('SELECT status FROM orders WHERE session_id = ?', s.id);
  const paid = one('SELECT COALESCE(SUM(amount),0) AS p FROM payments WHERE session_id = ?', s.id)!.p;
  let status = 'seated';
  if (orders.some((o) => o.status === 'ready')) status = 'ready';
  else if (orders.some((o) => o.status === 'new')) status = 'kitchen';
  else if (paid > 0) status = 'paying';
  else if (orders.length) status = 'eating';
  return { status, session: s };
}

function closeSessionIfPaid(sessionId: number) {
  const b = computeBill(sessionId);
  if (b.total > 0 && b.remaining <= 0.01) {
    const now = Date.now();
    run("UPDATE sessions SET status = 'closed', closed_at = ? WHERE id = ?", now, sessionId);
    run("UPDATE orders SET paid = 1, status = CASE WHEN status = 'served' THEN 'done' ELSE status END WHERE session_id = ?", sessionId);
    // loyalty: points + last order for members
    for (const d of b.diners.filter((x) => x.member_id)) {
      const pd = b.perDiner.find((x) => x.dinerId === d.id)!;
      const items = b.orders.flatMap((o) => o.items.filter((i: Row) => i.diner_id === d.id).map((i: Row) => i.name));
      run('UPDATE members SET points = points + ?, visits = visits + 1, last_items = COALESCE(?, last_items) WHERE id = ?',
        Math.floor(pd.paid / 10), items.length ? items.join(', ') : null, d.member_id);
    }
    return true;
  }
  return false;
}

function memberCard(memberId: number) {
  const m = one('SELECT * FROM members WHERE id = ?', memberId);
  if (!m) return null;
  return { ...m, events: memberEvents(m) };
}

function memberEvents(m: Row) {
  const ev: string[] = [];
  const now = new Date();
  const check = (mmdd: string, label: string) => {
    if (!mmdd) return;
    const [mm, dd] = mmdd.split('-').map(Number);
    for (let i = 0; i <= 7; i++) {
      const d = new Date(now.getTime() + i * DAY);
      if (d.getMonth() + 1 === mm && d.getDate() === dd) {
        ev.push(i === 0 ? `🎉 ${label} היום!` : i === 1 ? `${label} מחר` : `${label} בעוד ${i} ימים`);
        return;
      }
    }
  };
  check(m.birthday, 'יום הולדת');
  check(m.anniversary, 'יום נישואין');
  return ev;
}

export function tableState(table: number, deviceId: string) {
  tick();
  const t = one('SELECT * FROM tables WHERE number = ?', table);
  if (!t) throw new UserError('שולחן לא קיים');
  const s = openSessionFor(table);
  const base = { table: t, menu: getMenu(), settings: getSettings() };
  if (!s) {
    const last = one(
      `SELECT d.*, s.closed_at FROM diners d JOIN sessions s ON s.id = d.session_id
       WHERE s.table_number = ? AND d.device_id = ? AND s.status = 'closed' AND s.closed_at > ? ORDER BY d.id DESC LIMIT 1`,
      table, deviceId, Date.now() - 15 * MIN,
    );
    return { ...base, session: null, closedRecently: last ? { name: last.name, closedAt: last.closed_at } : null };
  }
  const bill = computeBill(s.id);
  const me = bill.diners.find((d) => d.device_id === deviceId) || null;
  return {
    ...base,
    session: s,
    me: me ? { ...me, member: me.member_id ? memberCard(me.member_id) : null } : null,
    bill: { ...bill, diners: bill.diners.map(({ device_id: _d, ...rest }) => rest) },
  };
}

/* ---------------------------------------------------------------- views */

export function waiterState() {
  tick();
  const tables = all('SELECT * FROM tables ORDER BY number').map((t) => {
    const st = tableStatus(t.number);
    let detail: Row | null = null;
    if (st.session) {
      const bill = computeBill(st.session.id);
      detail = {
        ...bill,
        diners: bill.diners.map((d) => ({ id: d.id, name: d.name, member: d.member_id ? memberCard(d.member_id) : null })),
      };
    }
    return { ...t, status: st.status, plan: st.plan ?? null, detail };
  });
  const alerts = all("SELECT * FROM alerts WHERE kind = 'waiter' AND seen = 0 ORDER BY id DESC");
  return { tables, alerts, menu: getMenu() };
}

export function kitchenState() {
  tick();
  const active = all("SELECT * FROM orders WHERE status = 'new' ORDER BY created_at").map((o) => ({
    ...orderWithItems(o),
    allergies: o.session_id
      ? all(`SELECT d.name, m.allergies FROM diners d JOIN members m ON m.id = d.member_id WHERE d.session_id = ? AND m.allergies != ''`, o.session_id)
      : [],
  }));
  const ready = all("SELECT * FROM orders WHERE status = 'ready' OR (status IN ('served','done') AND ready_at > ?) ORDER BY ready_at DESC LIMIT 12", Date.now() - 30 * MIN)
    .map(orderWithItems);
  const upcoming = all("SELECT * FROM plans WHERE status = 'collecting' ORDER BY scheduled_at").map((p) => ({
    ...p, count: one('SELECT COUNT(*) AS c FROM plan_participants WHERE plan_code = ? AND paid = 1', p.code)!.c,
  }));
  return { active, ready, upcoming, now: Date.now() };
}

function lastClosureTs() {
  return one('SELECT MAX(closed_at) AS t FROM day_closures')?.t || startOfDay();
}

function salesSince(from: number) {
  const rows = all('SELECT * FROM payments WHERE created_at >= ?', from);
  const byMethod: Record<string, number> = {};
  for (const p of rows) byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount);
  const orders = one("SELECT COUNT(*) AS c FROM orders WHERE created_at >= ? AND kind != 'plan'", from)!.c;
  return {
    total: round2(rows.reduce((s, p) => s + p.amount, 0)),
    tips: round2(rows.reduce((s, p) => s + (p.tip || 0), 0)),
    transactions: rows.length, orders, byMethod,
  };
}

export function posState() {
  const from = lastClosureTs();
  const receipts = all("SELECT * FROM orders WHERE kind = 'pos' ORDER BY id DESC LIMIT 8").map(orderWithItems);
  const closures = all('SELECT * FROM day_closures ORDER BY id DESC LIMIT 5').map((c) => ({ ...c, by_method: JSON.parse(c.by_method || '{}') }));
  return { menu: getMenu(), settings: getSettings(), shift: { from, ...salesSince(from) }, receipts, closures };
}

export function orderState(orderId?: number) {
  tick();
  const order = orderId ? one('SELECT * FROM orders WHERE id = ?', orderId) : null;
  return {
    menu: getMenu(), settings: getSettings(),
    order: order ? { ...orderWithItems(order), courier: order.courier_id ? one('SELECT * FROM couriers WHERE id = ?', order.courier_id) : null } : null,
  };
}

export function deliveryState() {
  tick();
  const orders = all(
    `SELECT * FROM orders WHERE kind IN ('delivery','pickup') AND (status NOT IN ('done') OR created_at > ?) ORDER BY created_at DESC`,
    Date.now() - 3 * HOUR,
  ).map((o) => ({ ...orderWithItems(o), courier: o.courier_id ? one('SELECT * FROM couriers WHERE id = ?', o.courier_id) : null }));
  const couriers = all('SELECT * FROM couriers').map((c) => ({
    ...c,
    active: one("SELECT COUNT(*) AS c FROM orders WHERE courier_id = ? AND delivery_status IN ('assigned','ready','on_the_way','pending')", c.id)!.c,
  }));
  return { orders, couriers };
}

export function staffState() {
  const staff = all('SELECT * FROM staff ORDER BY id');
  const shifts = all('SELECT * FROM shifts ORDER BY weekday, start');
  const today = ymd(Date.now());
  const todayAtt = all('SELECT * FROM attendance WHERE date = ? ORDER BY clock_in', today);
  const monthStart = new Date(); monthStart.setDate(1);
  const from = ymd(startOfDay(monthStart.getTime()));
  const att = all('SELECT * FROM attendance WHERE date >= ?', from);
  const report = staff.map((s) => {
    const rows = att.filter((a) => a.staff_id === s.id);
    const hours = rows.reduce((h, a) => h + ((a.clock_out || Date.now()) - a.clock_in) / HOUR, 0);
    const lates = rows.filter((a) => a.late_min > 0);
    return {
      staffId: s.id, name: s.name, role: s.role, shifts: rows.length, hours: Math.round(hours * 10) / 10,
      lates: lates.length, lateMinutes: lates.reduce((m, a) => m + a.late_min, 0), pay: Math.round(hours * s.rate),
    };
  });
  return { staff, shifts, todayAtt, report, now: Date.now() };
}

export function inventoryState() {
  const items = all('SELECT i.*, s.name AS supplier FROM inventory i LEFT JOIN suppliers s ON s.id = i.supplier_id ORDER BY (i.qty >= i.min_qty), i.name');
  const pos = all(`SELECT p.*, i.name AS item, i.unit, s.name AS supplier FROM purchase_orders p
    JOIN inventory i ON i.id = p.inventory_id JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.id DESC LIMIT 20`);
  const suppliers = all('SELECT * FROM suppliers');
  const recipes = all(`SELECT r.*, m.name AS dish, i.name AS item, i.unit FROM recipes r JOIN menu_items m ON m.id = r.menu_item_id
    JOIN inventory i ON i.id = r.inventory_id ORDER BY m.id`);
  return { items, purchaseOrders: pos, suppliers, recipes };
}

export function clubState() {
  const members = all('SELECT * FROM members ORDER BY points DESC').map((m) => ({ ...m, events: memberEvents(m) }));
  const campaigns = all('SELECT * FROM campaigns ORDER BY id DESC');
  return { members, campaigns, settings: getSettings() };
}

// Typical occupancy curve by hour (0–23), in percent
const TYPICAL = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 45, 70, 75, 60, 55, 55, 60, 70, 85, 90, 85, 70, 55];

export function adminState() {
  tick();
  const now = Date.now();
  const sod = startOfDay();
  const sales = salesSince(sod);
  const openSessions = all("SELECT * FROM sessions WHERE status = 'open'");
  const hour = new Date().getHours();
  const occupancy = Math.round((openSessions.length / 12) * 100);
  const typical = TYPICAL[hour] || 50;
  const nearby = all('SELECT id, distance_km FROM members WHERE marketing = 1 AND location = 1');
  const hourly: { hour: number; total: number }[] = [];
  for (let h = 10; h <= 23; h++) {
    const t = one('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE created_at >= ? AND created_at < ?', sod + h * HOUR, sod + (h + 1) * HOUR)!.s;
    hourly.push({ hour: h, total: round2(t) });
  }
  const top = all(`SELECT oi.name, SUM(oi.qty) AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= ? GROUP BY oi.name ORDER BY qty DESC LIMIT 5`, sod);
  const fb = all('SELECT score FROM feedback WHERE created_at >= ?', sod);
  return {
    sales, occupancy, typical, openTables: openSessions.map((s) => s.table_number).sort((a, b) => a - b),
    openTotal: round2(openSessions.reduce((s, x) => s + computeBill(x.id).remaining, 0)),
    avgCheck: sales.transactions ? round2(sales.total / sales.transactions) : 0,
    alerts: all("SELECT * FROM alerts WHERE kind IN ('feedback','stock','system') ORDER BY seen, id DESC LIMIT 12"),
    feedback: { count: fb.length, avg: fb.length ? round2(fb.reduce((s, f) => s + f.score, 0) / fb.length) : null, negative: fb.filter((f) => f.score <= 2).length },
    nearby: { r1: nearby.filter((m) => m.distance_km <= 1).length, r2: nearby.filter((m) => m.distance_km <= 2).length, r3: nearby.filter((m) => m.distance_km <= 3).length },
    campaigns: all('SELECT * FROM campaigns ORDER BY id DESC LIMIT 5'),
    hourly, top, chat: all('SELECT * FROM owner_chat ORDER BY id'), now,
    lowStock: one('SELECT COUNT(*) AS c FROM inventory WHERE qty < min_qty')!.c,
    settings: getSettings(),
  };
}

export function planState(code: string) {
  tick();
  const plan = one('SELECT * FROM plans WHERE code = ?', code.toUpperCase());
  if (!plan) return { plan: null, menu: getMenu(), settings: getSettings() };
  const participants = all(`SELECT p.*, m.name AS dish, m.price, m.emoji FROM plan_participants p JOIN menu_items m ON m.id = p.menu_item_id
    WHERE plan_code = ? ORDER BY p.id`, plan.code);
  const order = plan.order_id ? one('SELECT * FROM orders WHERE id = ?', plan.order_id) : null;
  return { plan, participants, order, menu: getMenu(), settings: getSettings() };
}

export function plansList() {
  return {
    plans: all('SELECT p.*, (SELECT COUNT(*) FROM plan_participants x WHERE x.plan_code = p.code) AS count FROM plans p ORDER BY scheduled_at DESC'),
    settings: getSettings(),
  };
}

/* ---------------------------------------------------------------- owner chat (fixed commands, no AI) */

function ownerReply(text: string): string {
  const t = text.trim();
  if (/מכרתי|מכירות|הכנסות|פדיון/.test(t)) {
    const s = salesSince(startOfDay());
    const top = all(`SELECT oi.name, SUM(oi.qty) AS q FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.created_at >= ?
      GROUP BY oi.name ORDER BY q DESC LIMIT 3`, startOfDay());
    return `💰 היום מכרת ב-₪${s.total.toLocaleString('he-IL')}\n🧾 ${s.orders} הזמנות · ${s.transactions} תשלומים\n💵 טיפים: ₪${s.tips.toLocaleString('he-IL')}` +
      (top.length ? `\n🔥 הכי נמכר: ${top.map((x) => `${x.name} (${x.q})`).join(', ')}` : '');
  }
  if (/איחר|איחור|מאחר/.test(t)) {
    const monthStart = new Date(); monthStart.setDate(1);
    const rows = all(`SELECT s.name, COUNT(*) AS c, SUM(a.late_min) AS m FROM attendance a JOIN staff s ON s.id = a.staff_id
      WHERE a.late_min > 0 AND a.date >= ? GROUP BY s.id ORDER BY c DESC`, ymd(startOfDay(monthStart.getTime())));
    if (!rows.length) return '👏 אף אחד לא איחר החודש!';
    return `⏰ איחורים החודש:\n${rows.map((r) => `• ${r.name} – ${r.c} פעמים (${r.m} דק׳ סה״כ)`).join('\n')}`;
  }
  const m = t.match(/^(?:תזמין|תזמיני|הזמן|להזמין)\s+(\d+(?:\.\d+)?)\s*(?:ק"ג|קילו|ליטר|יח'|יחידות)?\s*(.+)$/);
  if (m) {
    const qty = Number(m[1]);
    const word = m[2].trim().replace(/^ה/, '');
    const inv = all('SELECT * FROM inventory');
    const item = inv.find((i) => i.name.includes(word)) || inv.find((i) => word.includes(i.name)) ||
      inv.find((i) => i.name.split(/[\s(/)]+/).some((w: string) => w.length > 2 && (word.includes(w) || w.includes(word))));
    if (!item) return `לא מצאתי פריט "${m[2]}" במלאי 🤔\nפריטים לדוגמה: ${inv.slice(0, 5).map((i) => i.name).join(', ')}`;
    const sup = one('SELECT * FROM suppliers WHERE id = ?', item.supplier_id)!;
    run('INSERT INTO purchase_orders (supplier_id, inventory_id, qty, status, created_at, source) VALUES (?, ?, ?, ?, ?, ?)',
      sup.id, item.id, qty, 'sent', Date.now(), 'whatsapp');
    return `✅ הזמנתי ${qty} ${item.unit} ${item.name} מ"${sup.name}".\nאספקה צפויה ${sup.lead_days === 1 ? 'מחר' : `תוך ${sup.lead_days} ימי עסקים`}. (מלאי נוכחי: ${fmtQty(item.qty)} ${item.unit})`;
  }
  if (/מלאי/.test(t)) {
    const low = all('SELECT * FROM inventory WHERE qty < min_qty');
    return low.length ? `📦 פריטים במלאי נמוך:\n${low.map((i) => `• ${i.name}: ${fmtQty(i.qty)} ${i.unit}`).join('\n')}` : '📦 כל המלאי תקין';
  }
  if (/שולחנות|תפוסה/.test(t)) {
    const open = all("SELECT table_number FROM sessions WHERE status = 'open' ORDER BY table_number");
    return `🍽️ ${open.length} שולחנות פתוחים מתוך 12${open.length ? `: ${open.map((o) => o.table_number).join(', ')}` : ''}`;
  }
  return 'לא הבנתי 🙏 אני מכיר רק פקודות קבועות:\n• כמה מכרתי היום\n• מי איחר החודש\n• תזמין [כמות] [פריט]\n• מה חסר במלאי\n• כמה שולחנות פתוחים';
}

/* ---------------------------------------------------------------- actions */

function code5() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export function doAction(type: string, p: Row): Row {
  const conn = db();
  const fn = () => {
    switch (type) {
      case 'reset':
        resetDb();
        return { ok: true };

      /* ----- table / diner ----- */
      case 'joinTable': {
        const table = Number(p.table);
        let s = openSessionFor(table);
        if (!s) {
          const id = run("INSERT INTO sessions (table_number, opened_at, status, opened_by, guests) VALUES (?, ?, 'open', 'nfc', 0)", table, Date.now()).lastInsertRowid;
          s = one('SELECT * FROM sessions WHERE id = ?', id)!;
        }
        let d = one('SELECT * FROM diners WHERE session_id = ? AND device_id = ?', s.id, p.deviceId);
        if (!d) {
          const n = one('SELECT COUNT(*) AS c FROM diners WHERE session_id = ?', s.id)!.c;
          const name = String(p.name || '').trim() || `סועד ${n + 1}`;
          run('INSERT INTO diners (session_id, name, device_id, joined_at) VALUES (?, ?, ?, ?)', s.id, name, p.deviceId, Date.now());
        }
        return { ok: true };
      }
      case 'placeOrder': {
        const table = Number(p.table);
        let s = openSessionFor(table);
        if (!s) {
          if (!p.waiter) throw new UserError('השולחן סגור');
          const id = run("INSERT INTO sessions (table_number, opened_at, status, opened_by, guests) VALUES (?, ?, 'open', 'waiter', ?)", table, Date.now(), p.guests || 2).lastInsertRowid;
          s = one('SELECT * FROM sessions WHERE id = ?', id)!;
        }
        let dinerId: number | null = p.dinerId ?? null;
        if (p.deviceId) dinerId = one('SELECT id FROM diners WHERE session_id = ? AND device_id = ?', s.id, p.deviceId)?.id ?? null;
        const orderId = createOrder({
          kind: 'table', sessionId: s.id, table, note: p.note,
          items: (p.items as LineIn[]).map((l) => ({ ...l, dinerId: l.dinerId !== undefined ? l.dinerId : dinerId })),
        });
        return { ok: true, orderId };
      }
      case 'pay': {
        const s = one('SELECT * FROM sessions WHERE id = ?', p.sessionId);
        if (!s || s.status !== 'open') throw new UserError('השולחן כבר נסגר');
        const bill = computeBill(s.id);
        const amount = round2(Math.min(Number(p.amount) || 0, bill.remaining));
        if (amount <= 0) throw new UserError('אין יתרה לתשלום');
        run('INSERT INTO payments (session_id, diner_id, amount, tip, method, mode, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          s.id, p.dinerId ?? null, amount, round2(Number(p.tip) || 0), p.method || 'card', p.mode || 'custom', Date.now(), p.source || 'table');
        const closed = closeSessionIfPaid(s.id);
        return { ok: true, amount, closed };
      }
      case 'feedback': {
        const score = Number(p.score);
        const s = one('SELECT * FROM sessions WHERE id = ?', p.sessionId);
        const d = p.dinerId ? one('SELECT * FROM diners WHERE id = ?', p.dinerId) : null;
        run('UPDATE diners SET feedback = ? WHERE id = ?', score, p.dinerId ?? -1);
        run('INSERT INTO feedback (session_id, diner_id, table_number, score, created_at) VALUES (?, ?, ?, ?, ?)', p.sessionId, p.dinerId ?? null, s?.table_number ?? null, score, Date.now());
        if (score <= 2) {
          const faces = ['', '😡', '😕'];
          addAlert('feedback', `שולחן ${s?.table_number}: ${d?.name || 'סועד'} סימן ${faces[score]} "לא מרוצה" לפני התשלום${p.comment ? ` – "${p.comment}"` : ''}`, s?.table_number);
        }
        return { ok: true };
      }
      case 'joinClub': {
        const d = one('SELECT * FROM diners WHERE id = ?', p.dinerId);
        if (!d) throw new UserError('סועד לא נמצא');
        const phone = String(p.phone || '').trim();
        let m = phone ? one('SELECT * FROM members WHERE phone = ?', phone) : undefined;
        let welcome = false;
        if (!m) {
          const id = run(`INSERT INTO members (name, phone, email, points, tier, allergies, birthday, anniversary, marketing, location, distance_km, joined_at, visits, notes, last_items)
            VALUES (?, ?, '', 50, 'ברונזה', ?, '', '', ?, ?, ?, ?, 0, 'הצטרף/ה דרך מדבקת NFC בשולחן', '')`,
            String(p.name || d.name), phone, p.allergies || '', p.marketing ? 1 : 0, p.location ? 1 : 0, 0.5, Date.now()).lastInsertRowid;
          m = one('SELECT * FROM members WHERE id = ?', id)!;
          welcome = true;
        }
        run('UPDATE diners SET member_id = ?, name = ? WHERE id = ?', m.id, String(m.name).split(' ')[0], d.id);
        return { ok: true, welcome, member: m };
      }
      case 'renameDiner':
        run('UPDATE diners SET name = ? WHERE id = ?', String(p.name).slice(0, 20), p.dinerId);
        return { ok: true };
      case 'callWaiter':
        addAlert('waiter', `שולחן ${p.table}: ${p.message || 'קורא/ת למלצר'}`, Number(p.table));
        return { ok: true };

      /* ----- waiter ----- */
      case 'openTable': {
        if (openSessionFor(Number(p.table))) throw new UserError('השולחן כבר פתוח');
        run("INSERT INTO sessions (table_number, opened_at, status, opened_by, guests) VALUES (?, ?, 'open', 'waiter', ?)", Number(p.table), Date.now(), Number(p.guests) || 2);
        return { ok: true };
      }
      case 'setGuests':
        run('UPDATE sessions SET guests = ? WHERE id = ?', Number(p.guests), p.sessionId);
        return { ok: true };
      case 'markServed':
        run("UPDATE orders SET status = 'served' WHERE id = ?", p.orderId);
        return { ok: true };
      case 'closeTable':
        run("UPDATE sessions SET status = 'closed', closed_at = ? WHERE id = ?", Date.now(), p.sessionId);
        run("UPDATE orders SET status = CASE WHEN status IN ('served','ready') THEN 'done' ELSE status END WHERE session_id = ?", p.sessionId);
        return { ok: true };
      case 'dismissAlert':
        run('UPDATE alerts SET seen = 1 WHERE id = ?', p.id);
        return { ok: true };
      case 'removeItem': {
        const it = one('SELECT oi.*, o.status FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = ?', p.itemId);
        if (!it) throw new UserError('פריט לא נמצא');
        run('DELETE FROM order_items WHERE id = ?', p.itemId);
        if (!one('SELECT id FROM order_items WHERE order_id = ?', it.order_id)) run('DELETE FROM orders WHERE id = ?', it.order_id);
        return { ok: true };
      }

      /* ----- kitchen ----- */
      case 'markReady': {
        const o = one('SELECT * FROM orders WHERE id = ?', p.orderId);
        if (!o) throw new UserError('הזמנה לא נמצאה');
        const status = o.kind === 'pos' ? 'done' : 'ready';
        run('UPDATE orders SET status = ?, ready_at = ?, delivery_status = CASE WHEN kind = \'delivery\' AND delivery_status IN (\'pending\',\'assigned\') THEN \'ready\' ELSE delivery_status END WHERE id = ?',
          status, Date.now(), p.orderId);
        return { ok: true };
      }
      case 'undoReady':
        run("UPDATE orders SET status = 'new', ready_at = NULL, delivery_status = CASE WHEN kind = 'delivery' AND delivery_status = 'ready' THEN (CASE WHEN courier_id IS NULL THEN 'pending' ELSE 'assigned' END) ELSE delivery_status END WHERE id = ?", p.orderId);
        return { ok: true };

      /* ----- POS ----- */
      case 'posSale': {
        const orderId = createOrder({ kind: 'pos', items: p.items, paid: true, method: p.method, status: p.sendToKitchen ? 'new' : 'done', customerName: 'לקוח קופה' });
        const o = one('SELECT * FROM orders WHERE id = ?', orderId)!;
        run('INSERT INTO payments (order_id, amount, tip, method, mode, created_at, source) VALUES (?, ?, 0, ?, ?, ?, ?)', orderId, o.total, p.method, 'full', Date.now(), 'pos');
        return { ok: true, receipt: orderWithItems(o) };
      }
      case 'closeDay': {
        const from = lastClosureTs();
        const s = salesSince(from);
        const id = run('INSERT INTO day_closures (closed_at, from_ts, total, orders_count, by_method) VALUES (?, ?, ?, ?, ?)',
          Date.now(), from, s.total, s.orders, JSON.stringify(s.byMethod)).lastInsertRowid;
        return { ok: true, closure: { ...one('SELECT * FROM day_closures WHERE id = ?', id), by_method: s.byMethod, tips: s.tips, transactions: s.transactions } };
      }

      /* ----- online & delivery ----- */
      case 'onlineOrder': {
        const isDel = p.orderType === 'delivery';
        if (!p.name || !p.phone || (isDel && !p.address)) throw new UserError('נא למלא שם, טלפון' + (isDel ? ' וכתובת' : ''));
        const orderId = createOrder({
          kind: isDel ? 'delivery' : 'pickup', items: p.items, paid: true, method: p.method, customerName: p.name, phone: p.phone,
          address: isDel ? p.address : null, note: p.note, deliveryStatus: isDel ? 'pending' : null,
        });
        let total = one('SELECT total FROM orders WHERE id = ?', orderId)!.total;
        if (isDel) {
          total += 15;
          run('UPDATE orders SET total = ? WHERE id = ?', total, orderId);
        }
        run('INSERT INTO payments (order_id, amount, tip, method, mode, created_at, source) VALUES (?, ?, 0, ?, ?, ?, ?)', orderId, total, p.method, 'full', Date.now(), 'online');
        return { ok: true, orderId };
      }
      case 'assignCourier':
        run("UPDATE orders SET courier_id = ?, delivery_status = CASE WHEN delivery_status = 'pending' THEN 'assigned' ELSE delivery_status END WHERE id = ?", p.courierId, p.orderId);
        return { ok: true };
      case 'deliveryStatus': {
        const o = one('SELECT * FROM orders WHERE id = ?', p.orderId)!;
        if (p.status === 'on_the_way' && !o.courier_id) throw new UserError('יש לשייך שליח קודם');
        const done = p.status === 'delivered';
        run('UPDATE orders SET delivery_status = ?, status = CASE WHEN ? THEN \'done\' ELSE status END WHERE id = ?', p.status, done ? 1 : 0, p.orderId);
        return { ok: true };
      }
      case 'pickupCollected':
        run("UPDATE orders SET status = 'done' WHERE id = ?", p.orderId);
        return { ok: true };

      /* ----- staff ----- */
      case 'clock': {
        const today = ymd(Date.now());
        const open = one('SELECT * FROM attendance WHERE staff_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1', p.staffId);
        if (open) {
          run('UPDATE attendance SET clock_out = ? WHERE id = ?', Date.now(), open.id);
          return { ok: true, action: 'out' };
        }
        const wd = new Date().getDay();
        const shift = all('SELECT * FROM shifts WHERE staff_id = ? AND weekday = ?', p.staffId, wd)[0];
        let late = 0;
        if (shift) {
          const [h, m] = shift.start.split(':').map(Number);
          const planned = startOfDay() + h * HOUR + m * MIN;
          late = Math.max(0, Math.round((Date.now() - planned) / MIN));
          if (late < 5 || late > 240) late = 0;
        }
        run('INSERT INTO attendance (staff_id, date, clock_in, clock_out, late_min) VALUES (?, ?, ?, NULL, ?)', p.staffId, today, Date.now(), late);
        return { ok: true, action: 'in', late };
      }
      case 'addShift':
        run('INSERT INTO shifts (staff_id, weekday, start, end) VALUES (?, ?, ?, ?)', p.staffId, p.weekday, p.start, p.end);
        return { ok: true };
      case 'removeShift':
        run('DELETE FROM shifts WHERE id = ?', p.id);
        return { ok: true };

      /* ----- inventory ----- */
      case 'orderStock': {
        const it = one('SELECT * FROM inventory WHERE id = ?', p.inventoryId);
        if (!it) throw new UserError('פריט לא נמצא');
        run('INSERT INTO purchase_orders (supplier_id, inventory_id, qty, status, created_at, source) VALUES (?, ?, ?, ?, ?, ?)',
          it.supplier_id, it.id, Number(p.qty), 'sent', Date.now(), 'manual');
        return { ok: true };
      }
      case 'receivePO': {
        const po = one('SELECT * FROM purchase_orders WHERE id = ?', p.id);
        if (!po || po.status !== 'sent') throw new UserError('ההזמנה כבר התקבלה');
        run("UPDATE purchase_orders SET status = 'received', received_at = ? WHERE id = ?", Date.now(), po.id);
        run('UPDATE inventory SET qty = qty + ? WHERE id = ?', po.qty, po.inventory_id);
        run('UPDATE inventory SET alerted = 0 WHERE id = ? AND qty >= min_qty', po.inventory_id);
        return { ok: true };
      }

      /* ----- admin ----- */
      case 'sendCampaign': {
        const radius = Number(p.radius) || 2;
        const n = one('SELECT COUNT(*) AS c FROM members WHERE marketing = 1 AND location = 1 AND distance_km <= ?', radius)!.c;
        run('INSERT INTO campaigns (title, offer, recipients, radius, created_at) VALUES (?, ?, ?, ?, ?)', p.title || 'הטבת ברגע האחרון', p.offer, n, radius, Date.now());
        return { ok: true, recipients: n };
      }
      case 'ownerChat': {
        const text = String(p.text || '').trim();
        if (!text) return { ok: true };
        run("INSERT INTO owner_chat (sender, text, created_at) VALUES ('owner', ?, ?)", text, Date.now());
        run("INSERT INTO owner_chat (sender, text, created_at) VALUES ('bot', ?, ?)", ownerReply(text), Date.now() + 1);
        return { ok: true };
      }

      /* ----- planned meal ----- */
      case 'createPlan': {
        if (!p.title || !p.host || !p.when) throw new UserError('נא למלא את כל הפרטים');
        const code = code5();
        run("INSERT INTO plans (code, title, host, scheduled_at, table_number, status, guests_expected, created_at) VALUES (?, ?, ?, ?, ?, 'collecting', ?, ?)",
          code, p.title, p.host, Number(p.when), Number(p.table) || 11, Number(p.guests) || 6, Date.now());
        return { ok: true, code };
      }
      case 'planJoin': {
        const plan = one('SELECT * FROM plans WHERE code = ?', p.code);
        if (!plan) throw new UserError('קוד לא תקין');
        if (plan.status !== 'collecting') throw new UserError('ההזמנה כבר נשלחה למטבח');
        if (!p.name || !p.menuItemId) throw new UserError('נא לבחור שם ומנה');
        run('INSERT INTO plan_participants (plan_code, name, menu_item_id, paid, method, created_at) VALUES (?, ?, ?, 1, ?, ?)', plan.code, p.name, p.menuItemId, p.method || 'card', Date.now());
        const price = one('SELECT price FROM menu_items WHERE id = ?', p.menuItemId)!.price;
        run("INSERT INTO payments (amount, tip, method, mode, created_at, source) VALUES (?, 0, ?, 'prepaid', ?, 'plan')", price, p.method || 'card', Date.now());
        return { ok: true };
      }
      case 'planSendNow':
        sendPlanToKitchen(String(p.code));
        return { ok: true };

      default:
        throw new UserError(`פעולה לא מוכרת: ${type}`);
    }
  };
  return conn.transaction(fn)();
}

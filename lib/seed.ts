import type Database from 'better-sqlite3';

// Deterministic pseudo-random so every reset looks the same
function rng(seedNum: number) {
  let s = seedNum;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function ymd(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function md(ts: number) {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// [name, category, price, vegetarian, vegan, glutenFree, allergens, ingredients, description, emoji, popular, spicy]
type MenuRow = [string, string, number, number, number, number, string, string, string, string, number?, number?];
export const MENU: MenuRow[] = [
  ['פוקאצ\'ה הבית', 'ראשונות', 32, 1, 1, 0, 'גלוטן', 'קמח, שמן זית, רוזמרין, מלח ים, שום קונפי', 'יוצאת חמה מהטאבון עם מטבלים', '🍞', 1],
  ['חומוס פטריות', 'ראשונות', 46, 1, 1, 1, 'שומשום', 'חומוס, טחינה, פטריות יער, שמן זית, פטרוזיליה', 'חומוס קרמי עם פטריות מוקפצות', '🥣'],
  ['כרובית צלויה', 'ראשונות', 44, 1, 1, 1, 'שומשום, אגוזים', 'כרובית, טחינה, סילאן, צנוברים', 'כרובית שלמה מהטאבון', '🥦', 1],
  ['קרפצ\'יו בקר', 'ראשונות', 58, 0, 0, 1, 'חלב', 'פילה בקר, רוקט, פרמזן, שמן כמהין, לימון', 'פרוסות דקות של פילה עם פרמזן', '🥩'],
  ['טרטר סלק', 'ראשונות', 42, 1, 1, 1, 'חרדל', 'סלק, שאלוט, צלפים, חרדל דיז\'ון, שמן זית', 'טרטר צבעוני וטבעוני', '🫐'],
  ['סלט יווני', 'סלטים', 52, 1, 0, 1, 'חלב', 'עגבניות, מלפפון, בצל סגול, זיתי קלמטה, פטה, אורגנו', 'קלאסי, עם פטה כבשים', '🥗'],
  ['סלט קינואה', 'סלטים', 54, 1, 1, 1, 'אגוזים', 'קינואה, עשבי תיבול, חמוציות, שקדים, רימון, ויניגרט לימון', 'רענן ומשביע', '🥗'],
  ['סלט קיסר עוף', 'סלטים', 62, 0, 0, 0, 'גלוטן, ביצים, חלב, דגים', 'חסה רומית, חזה עוף, קרוטונים, פרמזן, רוטב קיסר', 'עם חזה עוף בגריל', '🥬'],
  ['פטוש', 'סלטים', 48, 1, 1, 0, 'גלוטן', 'ירקות קצוצים, פיתה קלויה, סומק, נענע, לימון', 'סלט ירקות לבנוני', '🥙'],
  ['המבורגר הבית', 'עיקריות', 78, 0, 0, 0, 'גלוטן, ביצים, שומשום', 'קציצת בקר 220 גרם, לחמניית בריוש, חסה, עגבנייה, בצל מקורמל, איולי, צ\'יפס', 'הלהיט של המסעדה', '🍔', 1],
  ['סטייק אנטריקוט', 'עיקריות', 138, 0, 0, 1, '', 'אנטריקוט 300 גרם, תפוחי אדמה צלויים, צ\'ימיצ\'ורי', 'נתח מיושן 21 יום', '🥩', 1],
  ['חזה עוף בגריל', 'עיקריות', 84, 0, 0, 1, 'חלב', 'חזה עוף, פירה, ירקות צלויים, רוטב פטריות', 'עם פירה חמאה', '🍗'],
  ['שניצל', 'עיקריות', 72, 0, 0, 0, 'גלוטן, ביצים', 'חזה עוף בפירורי לחם, צ\'יפס, סלט קטן', 'פריך, כמו של סבתא', '🍗'],
  ['קציצות ברוטב עגבניות', 'עיקריות', 76, 0, 0, 0, 'גלוטן, ביצים', 'בקר טחון, פירורי לחם, רוטב עגבניות, אורז לבן', 'מתבשלות לאט 3 שעות', '🍝'],
  ['בורגר טבעוני', 'עיקריות', 68, 1, 1, 0, 'גלוטן, סויה, שומשום', 'קציצת קטניות, לחמנייה טבעונית, חסה, עגבנייה, מיונז טבעוני, צ\'יפס', 'גם קרניבורים מזמינים', '🌱'],
  ['פנה ארביאטה', 'פסטות ופיצות', 58, 1, 1, 0, 'גלוטן', 'פנה, רוטב עגבניות חריף, שום, בזיליקום, שמן זית', 'חריפה ופשוטה', '🍝', 0, 1],
  ['ניוקי שמנת פטריות', 'פסטות ופיצות', 66, 1, 0, 0, 'גלוטן, חלב, ביצים', 'ניוקי תפוחי אדמה, שמנת, פטריות, פרמזן, טימין', 'עשיר וקטיפתי', '🍄'],
  ['פיצה מרגריטה', 'פסטות ופיצות', 58, 1, 0, 0, 'גלוטן, חלב', 'בצק מחמצת, רוטב עגבניות, מוצרלה, בזיליקום', 'מהטאבון, 30 ס"מ', '🍕', 1],
  ['ריזוטו פטריות', 'פסטות ופיצות', 68, 1, 0, 1, 'חלב', 'אורז ארבוריו, פטריות, פרמזן, חמאה, יין לבן', 'נטול גלוטן', '🍚'],
  ['קערת בודהה', 'עיקריות', 62, 1, 1, 1, 'שומשום, סויה', 'אורז מלא, טופו, אבוקדו, אדממה, כרוב סגול, רוטב טחינה-מיסו', 'טבעוני ועשיר בחלבון', '🥑'],
  ['מלבי', 'קינוחים', 34, 1, 0, 1, 'חלב, בוטנים', 'קרם חלב, מי ורדים, סירופ פטל, בוטנים, קוקוס', 'קינוח הבית', '🍮'],
  ['עוגת שוקולד חמה', 'קינוחים', 42, 1, 0, 0, 'גלוטן, ביצים, חלב', 'שוקולד מריר, חמאה, ביצים, קמח, גלידת וניל', 'לב נמס, 12 דקות הכנה', '🍫', 1],
  ['סורבה פירות', 'קינוחים', 32, 1, 1, 1, '', 'סורבה מנגו ופסיפלורה, נענע', 'טבעוני וקליל', '🍧'],
  ['לימונדה נענע', 'שתייה', 16, 1, 1, 1, '', 'לימון סחוט, נענע, סוכר קנים', 'סחוטה במקום', '🍋'],
  ['קפה הפוך', 'שתייה', 14, 1, 0, 1, 'חלב', 'אספרסו, חלב (אפשר סויה/שיבולת שועל)', 'פולים קלויים טריים', '☕'],
];

// [name, unit, qty, min, supplierIdx, cost]
const INVENTORY: [string, string, number, number, number, number][] = [
  ['קמח', 'ק"ג', 42, 15, 4, 4],
  ['שמן זית', 'ליטר', 18, 8, 4, 32],
  ['עגבניות', 'ק"ג', 9, 10, 1, 6],
  ['פטריות', 'ק"ג', 6, 4, 1, 28],
  ['בקר טחון', 'ק"ג', 14, 6, 2, 62],
  ['אנטריקוט', 'ק"ג', 7, 4, 2, 145],
  ['חזה עוף', 'ק"ג', 16, 8, 2, 38],
  ['גבינות (פטה/מוצרלה)', 'ק"ג', 8, 4, 3, 48],
  ['פרמזן', 'ק"ג', 2.2, 1.5, 3, 120],
  ['שמנת וחלב', 'ליטר', 12, 6, 3, 9],
  ['ביצים', 'יח\'', 140, 60, 3, 0.8],
  ['חומוס וטחינה', 'ק"ג', 11, 5, 4, 14],
  ['לחמניות', 'יח\'', 22, 30, 4, 2.5],
  ['תפוחי אדמה', 'ק"ג', 30, 12, 1, 4],
  ['ירקות ועלים', 'ק"ג', 13, 8, 1, 9],
  ['אורז וקינואה', 'ק"ג', 20, 8, 4, 11],
  ['פסטה וניוקי', 'ק"ג', 12, 6, 4, 13],
  ['שוקולד', 'ק"ג', 3.5, 2, 4, 55],
  ['טופו וקטניות', 'ק"ג', 5, 3, 4, 18],
  ['לימונים', 'ק"ג', 4, 3, 1, 7],
  ['פולי קפה', 'ק"ג', 3, 1.5, 5, 90],
];

// recipe: menu idx (1-based) -> [inventory idx (1-based), qty]
const RECIPES: Record<number, [number, number][]> = {
  1: [[1, 0.2], [2, 0.03]],
  2: [[12, 0.25], [4, 0.08], [2, 0.02]],
  3: [[15, 0.4], [12, 0.05]],
  4: [[6, 0.12], [9, 0.02], [15, 0.05]],
  5: [[15, 0.2], [2, 0.02]],
  6: [[3, 0.2], [15, 0.15], [8, 0.08]],
  7: [[16, 0.15], [15, 0.1], [20, 0.03]],
  8: [[7, 0.15], [15, 0.15], [9, 0.02], [11, 1]],
  9: [[15, 0.25], [3, 0.1], [20, 0.03]],
  10: [[5, 0.22], [13, 1], [14, 0.25], [11, 1]],
  11: [[6, 0.3], [14, 0.3]],
  12: [[7, 0.25], [14, 0.25], [10, 0.05]],
  13: [[7, 0.22], [11, 1], [1, 0.05], [14, 0.25]],
  14: [[5, 0.25], [3, 0.2], [16, 0.15], [11, 1]],
  15: [[19, 0.2], [13, 1], [14, 0.25]],
  16: [[17, 0.15], [3, 0.2], [2, 0.02]],
  17: [[17, 0.2], [10, 0.12], [4, 0.08], [9, 0.02]],
  18: [[1, 0.25], [3, 0.1], [8, 0.12]],
  19: [[16, 0.12], [4, 0.1], [9, 0.03], [10, 0.05]],
  20: [[16, 0.15], [19, 0.15], [15, 0.15]],
  21: [[10, 0.15]],
  22: [[18, 0.08], [11, 2], [1, 0.03], [10, 0.05]],
  23: [[20, 0.02]],
  24: [[20, 0.08]],
  25: [[21, 0.018], [10, 0.15]],
};

const SUPPLIERS: [string, string, string, string, number][] = [
  ['ירקות השרון', 'אבי', '050-5550101', 'ירקות ופירות', 1],
  ['קצביית הגליל', 'מוחמד', '052-5550202', 'בשר ועוף', 1],
  ['מחלבת העמק', 'רינה', '054-5550303', 'מוצרי חלב וביצים', 1],
  ['סיטונאות המרכז', 'גל', '03-5550404', 'יבשים ומאפים', 2],
  ['קפה רומא', 'לוקה', '053-5550505', 'קפה', 3],
];

const FIRST = ['דנה', 'יוסי', 'מיכל', 'אורי', 'נועה', 'איתי', 'שירה', 'עומר', 'תמר', 'רון', 'מאיה', 'עידו', 'ליאת', 'אמיר', 'הדר', 'גיא', 'יעל', 'נדב', 'רותם', 'אלון', 'סהר', 'ענבל', 'בן', 'קרן', 'עמית', 'ליה', 'דור', 'אביגיל', 'שי', 'ניר', 'רעות', 'טל', 'אדם', 'מור', 'יונתן', 'אור', 'נטע', 'ברק', 'שקד', 'לירון'];
const LAST = ['לוי', 'כהן', 'מזרחי', 'פרץ', 'ביטון', 'אברהם', 'פרידמן', 'שפירא', 'דהן', 'אזולאי', 'גבאי', 'חדד', 'אוחיון', 'רוזן', 'ברק', 'גולן', 'שרון', 'נחום', 'סלים', 'חורי'];

export function seed(conn: Database.Database) {
  const now = Date.now();
  const today = startOfDay(now);
  const r = rng(42);

  const setting = conn.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  const settings: Record<string, string> = {
    restaurant_name: 'ביסטרו הנמל',
    address: 'רחוב הנמל 12, תל אביב',
    phone: '03-5551234',
    hours: 'א׳–ה׳ 12:00–23:00 · ו׳ 11:00–16:00 · מוצ״ש 19:00–00:00',
    parking: 'חניון הנמל צמוד למסעדה (כניסה מרחוב הירקון). 2 שעות חנייה חינם עם חשבונית. יש גם חניות כחול-לבן ברחוב.',
    kosher: 'המסעדה אינה בהשגחת כשרות. אין במטבח חזיר או פירות ים.',
    accessibility: 'המסעדה נגישה לכיסאות גלגלים, כולל שירותי נכים.',
    wifi: 'רשת: AETGO-Guest · סיסמה: bistro2026',
    google_review_url: 'https://www.google.com/maps/search/?api=1&query=%D7%91%D7%99%D7%A1%D7%98%D7%A8%D7%95',
  };
  for (const [k, v] of Object.entries(settings)) setting.run(k, v);

  const mi = conn.prepare(`INSERT INTO menu_items (id, name, category, price, vegetarian, vegan, gluten_free, allergens, ingredients, description, emoji, popular, spicy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  MENU.forEach((m, i) => mi.run(i + 1, m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10] ?? 0, m[11] ?? 0));

  const tb = conn.prepare('INSERT INTO tables (number, seats, area) VALUES (?, ?, ?)');
  for (let n = 1; n <= 12; n++) tb.run(n, [2, 4, 4, 2, 4, 6, 4, 2, 4, 4, 8, 2][n - 1], n <= 8 ? 'פנים' : 'מרפסת');

  const sp = conn.prepare('INSERT INTO suppliers (id, name, contact, phone, category, lead_days) VALUES (?, ?, ?, ?, ?, ?)');
  SUPPLIERS.forEach((s, i) => sp.run(i + 1, ...s));
  const inv = conn.prepare('INSERT INTO inventory (id, name, unit, qty, min_qty, supplier_id, cost) VALUES (?, ?, ?, ?, ?, ?, ?)');
  INVENTORY.forEach((it, i) => inv.run(i + 1, ...it));
  const rc = conn.prepare('INSERT INTO recipes (menu_item_id, inventory_id, qty) VALUES (?, ?, ?)');
  for (const [m, rows] of Object.entries(RECIPES)) for (const [invId, q] of rows) rc.run(Number(m), invId, q);
  conn.prepare('INSERT INTO purchase_orders (supplier_id, inventory_id, qty, status, created_at, source) VALUES (?, ?, ?, ?, ?, ?)')
    .run(1, 3, 15, 'sent', now - 3 * HOUR, 'manual');

  // Couriers
  const co = conn.prepare('INSERT INTO couriers (id, name, phone, vehicle) VALUES (?, ?, ?, ?)');
  co.run(1, 'מוטי', '050-7770001', 'קטנוע');
  co.run(2, 'סיוון', '050-7770002', 'אופניים חשמליים');
  co.run(3, 'ג\'ורג\'', '050-7770003', 'רכב');

  // Members
  const mem = conn.prepare(`INSERT INTO members (id, name, phone, email, points, tier, allergies, birthday, anniversary, marketing, location, distance_km, joined_at, visits, notes, last_items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  mem.run(1, 'דנה לוי', '050-1234567', 'dana@example.com', 1240, 'זהב', 'אגוזים, בוטנים', md(now + 2 * DAY), '', 1, 1, 0.8, now - 400 * DAY, 23,
    'אוהבת שולחן ליד החלון', 'המבורגר הבית, לימונדה נענע, עוגת שוקולד חמה');
  mem.run(2, 'יוסי כהן', '052-7654321', 'yossi@example.com', 610, 'כסף', 'טבעוני', '', md(now), 1, 1, 1.4, now - 200 * DAY, 11,
    'יום נישואין היום! להציע קינוח על חשבון הבית', 'קערת בודהה, סורבה פירות');
  mem.run(3, 'מיכל אברהם', '054-1112233', 'michal@example.com', 320, 'כסף', 'גלוטן (צליאק)', '', '', 1, 1, 2.1, now - 120 * DAY, 7,
    '', 'ריזוטו פטריות, סלט יווני');
  let id = 4;
  for (let i = 0; i < 147; i++) {
    const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    const pts = Math.floor(r() * 900) + 20;
    const tier = pts > 700 ? 'זהב' : pts > 300 ? 'כסף' : 'ברונזה';
    const allergies = r() < 0.2 ? ['גלוטן', 'חלב', 'אגוזים', 'שומשום'][Math.floor(r() * 4)] : '';
    const bday = r() < 0.15 ? md(now + Math.floor(r() * 7) * DAY) : md(now + Math.floor(r() * 300 + 10) * DAY);
    const items = [MENU[Math.floor(r() * 20)][0], MENU[23 + Math.floor(r() * 2)][0]].join(', ');
    mem.run(id++, name, `05${Math.floor(r() * 9)}-${String(Math.floor(r() * 9000000) + 1000000)}`, '', pts, tier, allergies, bday, '',
      r() < 0.85 ? 1 : 0, r() < 0.75 ? 1 : 0, Math.round((r() * r() * 6 + 0.2) * 10) / 10, now - Math.floor(r() * 500) * DAY,
      Math.floor(r() * 20) + 1, '', items);
  }

  // Staff, shifts, attendance
  const STAFF: [string, string, number, string][] = [
    ['אביטל', 'אחראית משמרת', 58, '#ff5a1f'],
    ['נתנאל', 'מלצר', 40, '#2563eb'],
    ['ליהי', 'מלצרית', 40, '#16a34a'],
    ['עדן', 'מלצרית', 38, '#9333ea'],
    ['סמיר', 'שף', 72, '#dc2626'],
    ['קובי', 'טבח', 48, '#0891b2'],
    ['רוני', 'מארחת', 38, '#db2777'],
    ['מוטי', 'שליח', 42, '#65a30d'],
  ];
  const st = conn.prepare('INSERT INTO staff (id, name, role, rate, color) VALUES (?, ?, ?, ?, ?)');
  STAFF.forEach((s, i) => st.run(i + 1, ...s));
  const sh = conn.prepare('INSERT INTO shifts (staff_id, weekday, start, end) VALUES (?, ?, ?, ?)');
  const shiftPlan: Record<number, [number[], string, string][]> = {
    1: [[[0, 1, 2, 3, 4], '11:00', '19:00']],
    2: [[[0, 2, 4], '11:30', '17:30'], [[1, 3, 6], '17:30', '23:30']],
    3: [[[1, 3], '11:30', '17:30'], [[0, 2, 4, 5], '17:30', '23:30']],
    4: [[[0, 1, 4, 5], '17:30', '23:30'], [[6], '18:30', '00:00']],
    5: [[[0, 1, 2, 3, 4], '10:00', '18:00'], [[5], '10:00', '15:00']],
    6: [[[0, 1, 2, 3], '16:00', '23:30'], [[6], '18:00', '00:00']],
    7: [[[3, 4, 5], '18:00', '23:00']],
    8: [[[0, 2, 4, 6], '18:00', '23:00'], [[3], '12:00', '16:00']],
  };
  for (const [sid, plans] of Object.entries(shiftPlan))
    for (const [days, s, e] of plans) for (const d of days) sh.run(Number(sid), d, s, e);

  const at = conn.prepare('INSERT INTO attendance (staff_id, date, clock_in, clock_out, late_min) VALUES (?, ?, ?, ?, ?)');
  const monthStart = new Date(today); monthStart.setDate(1);
  const shiftsRows = conn.prepare('SELECT * FROM shifts').all() as { staff_id: number; weekday: number; start: string; end: string }[];
  // Ensure some late arrivals this month
  const lateBias: Record<number, number> = { 3: 0.35, 6: 0.3, 4: 0.12 };
  for (let t = monthStart.getTime(); t < today; t += DAY) {
    const wd = new Date(t).getDay();
    for (const s of shiftsRows.filter((x) => x.weekday === wd)) {
      const [sh1, sm1] = s.start.split(':').map(Number);
      const [eh, em] = s.end.split(':').map(Number);
      const planned = t + sh1 * HOUR + sm1 * MIN;
      let end = t + eh * HOUR + em * MIN;
      if (end <= planned) end += DAY;
      const late = r() < (lateBias[s.staff_id] ?? 0.05) ? Math.floor(r() * 22) + 6 : 0;
      const early = late ? 0 : Math.floor(r() * 8);
      at.run(s.staff_id, ymd(t), planned + late * MIN - early * MIN, end + Math.floor(r() * 20) * MIN, late);
    }
  }
  // Today: staff already clocked in for current shifts
  const nowWd = new Date(now).getDay();
  for (const s of shiftsRows.filter((x) => x.weekday === nowWd)) {
    const [h, m] = s.start.split(':').map(Number);
    const planned = today + h * HOUR + m * MIN;
    if (planned < now - 10 * MIN) {
      const late = s.staff_id === 3 ? 12 : 0;
      at.run(s.staff_id, ymd(now), planned + late * MIN - (late ? 0 : 4 * MIN), null, late);
    }
  }

  // Make sure the floor is never empty in the demo, whatever the weekday/time
  const onShift = conn.prepare('SELECT COUNT(*) AS c FROM attendance WHERE date = ? AND clock_out IS NULL').get(ymd(now)) as { c: number };
  if (onShift.c < 3) {
    for (const [sid, mins, late] of [[1, 150, 0], [5, 140, 0], [2, 95, 0], [3, 80, 14]] as [number, number, number][]) {
      const exists = conn.prepare('SELECT id FROM attendance WHERE date = ? AND staff_id = ? AND clock_out IS NULL').get(ymd(now), sid);
      if (!exists) at.run(sid, ymd(now), now - mins * MIN, null, late);
    }
  }

  // Historic orders earlier today (closed)
  const ins = conn.prepare(`INSERT INTO orders (kind, session_id, table_number, status, created_at, ready_at, customer_name, phone, address, courier_id, delivery_status, paid, pay_method, total, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insItem = conn.prepare('INSERT INTO order_items (order_id, menu_item_id, name, price, qty, diner_id) VALUES (?, ?, ?, ?, ?, ?)');
  const pay = conn.prepare('INSERT INTO payments (session_id, order_id, diner_id, amount, tip, method, mode, created_at, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const methods = ['card', 'card', 'apple', 'google', 'bit', 'cash'];
  const histStart = Math.max(today + 12 * HOUR, now - 9 * HOUR);
  const histEnd = now - 25 * MIN;
  const nHist = histEnd > histStart ? 22 : 0;
  for (let i = 0; i < nHist; i++) {
    const t = histStart + Math.floor(((histEnd - histStart) * i) / nHist);
    const kind = ['table', 'table', 'table', 'pos', 'delivery', 'pickup'][Math.floor(r() * 6)];
    const items: number[] = [];
    const n = kind === 'table' ? 3 + Math.floor(r() * 4) : 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) items.push(1 + Math.floor(r() * 25));
    const total = items.reduce((s, x) => s + MENU[x - 1][2], 0);
    const method = methods[Math.floor(r() * methods.length)];
    let sessionId: number | null = null;
    const tableNo = kind === 'table' ? 1 + Math.floor(r() * 12) : null;
    if (kind === 'table') {
      sessionId = Number(conn.prepare('INSERT INTO sessions (table_number, opened_at, closed_at, status, opened_by, guests) VALUES (?, ?, ?, ?, ?, ?)')
        .run(tableNo, t, t + 70 * MIN, 'closed', 'nfc', 2 + Math.floor(r() * 3)).lastInsertRowid);
    }
    const oid = Number(ins.run(kind, sessionId, tableNo, 'done', t, t + 14 * MIN, kind === 'delivery' || kind === 'pickup' ? `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}` : null,
      null, kind === 'delivery' ? 'דיזנגוף 100, תל אביב' : null, kind === 'delivery' ? 1 : null, kind === 'delivery' ? 'delivered' : null, 1, method, total, null).lastInsertRowid);
    for (const x of items) insItem.run(oid, x, MENU[x - 1][0], MENU[x - 1][2], 1, null);
    pay.run(sessionId, oid, null, total, kind === 'table' ? Math.round(total * 0.12) : 0, method, 'full', t + (kind === 'table' ? 65 : 1) * MIN, 'seed');
  }

  // Live open tables
  const openSession = (table: number, minsAgo: number, guests: number) =>
    Number(conn.prepare('INSERT INTO sessions (table_number, opened_at, status, opened_by, guests) VALUES (?, ?, ?, ?, ?)')
      .run(table, now - minsAgo * MIN, 'open', 'nfc', guests).lastInsertRowid);
  const addDiner = (sid: number, name: string, memberId: number | null, minsAgo: number) =>
    Number(conn.prepare('INSERT INTO diners (session_id, name, device_id, member_id, joined_at) VALUES (?, ?, ?, ?, ?)')
      .run(sid, name, `seed-${sid}-${name}`, memberId, now - minsAgo * MIN).lastInsertRowid);
  const addOrder = (sid: number, table: number, status: string, minsAgo: number, lines: [number, number | null][]) => {
    const total = lines.reduce((s, [m]) => s + MENU[m - 1][2], 0);
    const oid = Number(ins.run('table', sid, table, status, now - minsAgo * MIN, status === 'new' ? null : now - (minsAgo - 12) * MIN,
      null, null, null, null, null, 0, null, total, null).lastInsertRowid);
    for (const [m, d] of lines) insItem.run(oid, m, MENU[m - 1][0], MENU[m - 1][2], 1, d);
  };

  // Table 2: member Dana is seated, food served
  const s2 = openSession(2, 48, 2);
  const d2a = addDiner(s2, 'דנה', 1, 47);
  const d2b = addDiner(s2, 'אלעד', null, 45);
  addOrder(s2, 2, 'served', 40, [[10, d2a], [24, d2a], [16, d2b], [1, null]]);

  // Table 6: ordered, kitchen working on it
  const s6 = openSession(6, 22, 5);
  const d6 = [addDiner(s6, 'שחר', null, 21), addDiner(s6, 'ליאור', null, 20), addDiner(s6, 'נגה', null, 20)];
  addOrder(s6, 6, 'new', 9, [[11, d6[0]], [18, d6[1]], [20, d6[2]], [2, null], [24, d6[0]]]);

  // Table 9: food ready, waiting to be served
  const s9 = openSession(9, 30, 3);
  const d9 = [addDiner(s9, 'מאיר', null, 29), addDiner(s9, 'רחל', null, 28)];
  addOrder(s9, 9, 'ready', 18, [[13, d9[0]], [6, d9[1]], [25, d9[1]]]);

  // Pending online orders
  const del = Number(ins.run('delivery', null, null, 'new', now - 6 * MIN, null, 'עדי שמעוני', '050-9998877', 'בן יהודה 45, דירה 7, תל אביב', null, 'pending', 1, 'card', 152, 'בלי בצל בבקשה').lastInsertRowid);
  insItem.run(del, 10, MENU[9][0], MENU[9][2], 1, null);
  insItem.run(del, 18, MENU[17][0], MENU[17][2], 1, null);
  insItem.run(del, 24, MENU[23][0], MENU[23][2], 1, null);
  const del2 = Number(ins.run('delivery', null, null, 'ready', now - 24 * MIN, now - 4 * MIN, 'אריאל גרין', '052-3332211', 'גורדון 8, תל אביב', null, 'ready', 1, 'apple', 96, null).lastInsertRowid);
  insItem.run(del2, 20, MENU[19][0], MENU[19][2], 1, null);
  insItem.run(del2, 21, MENU[20][0], MENU[20][2], 1, null);
  for (const [oid, total, m] of [[del, 152, 'card'], [del2, 96, 'apple']] as [number, number, string][])
    pay.run(null, oid, null, total, 0, m, 'full', now - 6 * MIN, 'online');

  // Feedback & alerts
  conn.prepare('INSERT INTO feedback (session_id, diner_id, table_number, score, created_at) VALUES (?, ?, ?, ?, ?)').run(null, null, 4, 2, now - 55 * MIN);
  const al = conn.prepare('INSERT INTO alerts (kind, table_number, message, created_at, seen) VALUES (?, ?, ?, ?, ?)');
  al.run('feedback', 4, 'שולחן 4: סועד סימן 😕 "לא מרוצה" לפני התשלום', now - 55 * MIN, 0);
  al.run('stock', null, 'מלאי נמוך: לחמניות (22 יח\' / מינימום 30)', now - 2 * HOUR, 0);
  al.run('stock', null, 'מלאי נמוך: עגבניות (9 ק"ג / מינימום 10)', now - 3 * HOUR, 1);
  conn.prepare('UPDATE inventory SET alerted = 1 WHERE qty < min_qty').run();

  // Planned meal
  let planAt = today + 20 * HOUR + 30 * MIN;
  if (planAt < now + 30 * MIN) planAt += DAY;
  conn.prepare('INSERT INTO plans (code, title, host, scheduled_at, table_number, status, guests_expected, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('NOA30', 'יום הולדת 30 לנועה 🎉', 'נועה', planAt, 11, 'collecting', 8, now - 2 * DAY);
  const pp = conn.prepare('INSERT INTO plan_participants (plan_code, name, menu_item_id, paid, method, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  pp.run('NOA30', 'נועה', 19, 1, 'apple', now - 2 * DAY);
  pp.run('NOA30', 'גלעד', 11, 1, 'bit', now - DAY);
  pp.run('NOA30', 'שני', 7, 1, 'card', now - 5 * HOUR);

  conn.prepare('INSERT INTO owner_chat (sender, text, created_at) VALUES (?, ?, ?)')
    .run('bot', 'היי! אני העוזר של AET GO 👋\nאפשר לשאול אותי:\n• כמה מכרתי היום\n• מי איחר החודש\n• תזמין 10 עגבניות', now - 60 * MIN);
}

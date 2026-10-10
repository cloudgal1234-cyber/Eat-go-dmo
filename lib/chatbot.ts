// Rule-based restaurant assistant – NO AI. Answers only from the restaurant's own data.

export type MenuItem = {
  id: number; name: string; category: string; price: number; description: string; ingredients: string;
  vegetarian: boolean; vegan: boolean; gluten_free: boolean; allergens: string[]; spicy: boolean; popular: boolean; emoji: string;
};

export type BotAnswer = { text: string; items?: MenuItem[]; unknown?: boolean };

const ALLERGENS: Record<string, string[]> = {
  'גלוטן': ['גלוטן', 'צליאק', 'חיטה'],
  'חלב': ['חלב', 'לקטוז', 'חלבי', 'גבינה'],
  'ביצים': ['ביצים', 'ביצה'],
  'אגוזים': ['אגוזים', 'אגוז', 'שקדים', 'צנוברים'],
  'בוטנים': ['בוטנים', 'בוטן'],
  'שומשום': ['שומשום', 'טחינה'],
  'סויה': ['סויה'],
  'חרדל': ['חרדל'],
  'דגים': ['דגים', 'דג', 'אנשובי'],
};

const CATEGORIES: Record<string, string[]> = {
  'ראשונות': ['ראשונות', 'ראשונה', 'פתיח', 'מנה ראשונה'],
  'סלטים': ['סלט', 'סלטים'],
  'עיקריות': ['עיקרית', 'עיקריות', 'מנה עיקרית'],
  'פסטות ופיצות': ['פסטה', 'פיצה', 'פסטות'],
  'קינוחים': ['קינוח', 'קינוחים', 'מתוק'],
  'שתייה': ['שתייה', 'לשתות', 'משקה', 'שתיה'],
};

const STOP = new Set(['של', 'עם', 'את', 'הבית', 'בגריל', 'ברוטב', 'טבעוני', 'צמחוני', 'סלט', 'חמה', 'ללא', 'גלוטן']);

function has(t: string, words: string[]) {
  return words.some((w) => t.includes(w));
}

function findDish(t: string, menu: MenuItem[]) {
  const exact = menu.find((m) => t.includes(m.name));
  if (exact) return exact;
  let best: { m: MenuItem; score: number } | null = null;
  for (const m of menu) {
    const words = m.name.replace(/['"׳]/g, '').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));
    const score = words.filter((w) => t.replace(/['"׳]/g, '').includes(w)).length;
    if (score && (!best || score > best.score)) best = { m, score };
  }
  return best?.m;
}

function list(items: MenuItem[], max = 8) {
  return items.slice(0, max);
}

export function answer(question: string, menu: MenuItem[], settings: Record<string, string>): BotAnswer {
  const t = ' ' + question.trim().replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ') + ' ';
  if (!question.trim()) return { text: 'אפשר לשאול אותי על מנות, אלרגנים, מחירים, שעות וחניה 😊' };

  if (has(t, [' שלום', ' היי', 'הי ', 'בוקר טוב', 'ערב טוב', 'מה נשמע'])) {
    return { text: `שלום! אני העוזר הדיגיטלי של ${settings.restaurant_name} 👋 אפשר לשאול אותי על מנות, אלרגנים, טבעוני/צמחוני, מחירים, כשרות, שעות פתיחה וחניה.` };
  }
  if (has(t, ['תודה'])) return { text: 'בשמחה! בתיאבון 🍽️' };
  if (has(t, ['שעות', 'פתוחים', 'פתוח', 'סוגרים', 'עד מתי', 'נסגר'])) return { text: `🕒 שעות הפתיחה: ${settings.hours}` };
  if (has(t, ['חניה', 'חנייה', 'לחנות', 'חניון'])) return { text: `🅿️ ${settings.parking}` };
  if (has(t, ['כשר', 'כשרות', 'השגחה', 'רבנות'])) return { text: `✡️ ${settings.kosher}` };
  if (has(t, ['נגיש', 'נגישות', 'כיסא גלגלים'])) return { text: `♿ ${settings.accessibility}` };
  if (has(t, ['wifi', 'וויפי', 'ווייפיי', 'אינטרנט', 'סיסמה', 'סיסמא'])) return { text: `📶 ${settings.wifi}` };
  if (has(t, ['כתובת', 'איפה אתם', 'איך מגיעים', 'טלפון'])) return { text: `📍 ${settings.address} · ☎️ ${settings.phone}` };

  const askAllergen = Object.entries(ALLERGENS).filter(([, syn]) => has(t, syn)).map(([a]) => a);
  const dish = findDish(t, menu);

  // ---- Question about a specific dish
  if (dish) {
    if (askAllergen.length) {
      const lines = askAllergen.map((a) =>
        a === 'גלוטן' && dish.gluten_free ? `✅ ${dish.name} ללא גלוטן` :
        dish.allergens.includes(a) ? `⚠️ כן, ב${dish.name} יש ${a}` : `✅ אין ${a} ב${dish.name}`);
      return { text: lines.join('\n') + (dish.allergens.length ? `\nכל האלרגנים במנה: ${dish.allergens.join(', ')}` : ''), items: [dish] };
    }
    if (has(t, ['אלרג'])) {
      return { text: dish.allergens.length ? `⚠️ אלרגנים ב${dish.name}: ${dish.allergens.join(', ')}` : `✅ ב${dish.name} אין אלרגנים מוכרים`, items: [dish] };
    }
    if (has(t, ['טבעוני'])) return { text: dish.vegan ? `🌱 כן, ${dish.name} טבעונית` : `לא, ${dish.name} אינה טבעונית${dish.vegetarian ? ' (אבל היא צמחונית)' : ''}`, items: [dish] };
    if (has(t, ['צמחוני'])) return { text: dish.vegetarian ? `🥕 כן, ${dish.name} צמחונית` : `לא, ${dish.name} אינה צמחונית`, items: [dish] };
    if (has(t, ['חריף'])) return { text: dish.spicy ? `🌶️ כן, ${dish.name} חריפה` : `${dish.name} לא חריפה`, items: [dish] };
    if (has(t, ['כמה עולה', 'מחיר', 'עולה'])) return { text: `${dish.name}: ₪${dish.price}`, items: [dish] };
    return { text: `${dish.emoji} ${dish.name} – ₪${dish.price}\n${dish.description}\nרכיבים: ${dish.ingredients}` + (dish.allergens.length ? `\nאלרגנים: ${dish.allergens.join(', ')}` : ''), items: [dish] };
  }

  // ---- Filtering the menu
  let items = [...menu];
  const applied: string[] = [];
  if (has(t, ['טבעוני', 'טבעונית', 'טבעוניות', 'vegan'])) { items = items.filter((m) => m.vegan); applied.push('טבעוני'); }
  else if (has(t, ['צמחוני', 'צמחונית', 'צמחוניות', 'בלי בשר'])) { items = items.filter((m) => m.vegetarian); applied.push('צמחוני'); }
  if (askAllergen.length) {
    for (const a of askAllergen) items = items.filter((m) => !m.allergens.includes(a) && (a !== 'גלוטן' || m.gluten_free));
    applied.push(`ללא ${askAllergen.join(', ')}`);
  }
  for (const [cat, syn] of Object.entries(CATEGORIES)) {
    if (has(t, syn)) { items = items.filter((m) => m.category === cat); applied.push(cat); break; }
  }
  if (has(t, ['חריף'])) { items = items.filter((m) => m.spicy); applied.push('חריף'); }
  if (has(t, ['מומלץ', 'ממליץ', 'הכי טוב', 'פופולרי', 'להיט', 'מה כדאי'])) { items = items.filter((m) => m.popular); applied.push('מומלצות'); }
  const num = t.match(/(\d{2,3})/);
  if (num && has(t, ['עד', 'פחות', 'מתחת', 'תקציב', 'לא יותר', '₪', 'שקל', 'ש"ח'])) {
    const max = Number(num[1]);
    items = items.filter((m) => m.price <= max);
    applied.push(`עד ₪${max}`);
  } else if (num && has(t, ['מעל', 'יותר מ'])) {
    const min = Number(num[1]);
    items = items.filter((m) => m.price >= min);
    applied.push(`מעל ₪${min}`);
  }
  if (has(t, ['הכי זול', 'זול', 'זולות', 'משתלם'])) { items = [...items].sort((a, b) => a.price - b.price).slice(0, 5); applied.push('הזולות ביותר'); }

  if (applied.length) {
    if (!items.length) return { text: `לא מצאתי מנות שמתאימות ל: ${applied.join(' · ')} 😕` };
    return { text: `מצאתי ${items.length} מנות (${applied.join(' · ')}):`, items: list(items, 10) };
  }

  if (has(t, ['תפריט', 'מה יש', 'מה אפשר'])) return { text: 'אלו המנות המומלצות שלנו:', items: menu.filter((m) => m.popular) };
  if (has(t, ['אלרג', 'רגיש'])) return { text: 'על איזו מנה או איזה אלרגן לבדוק? לדוגמה: "יש גלוטן בשניצל?" או "מנות בלי אגוזים"' };

  return { text: 'שאלה טובה! את זה אני לא יודע לענות 🙋 שלחתי את השאלה למלצר – הוא יגיע לשולחן בקרוב.', unknown: true };
}

export const SUGGESTIONS = [
  'מה טבעוני?',
  'מנות ללא גלוטן',
  'יש אגוזים במלבי?',
  'מה יש בהמבורגר?',
  'מנות עיקריות עד 70 ₪',
  'האם המסעדה כשרה?',
  'שעות פתיחה',
  'איפה חונים?',
];

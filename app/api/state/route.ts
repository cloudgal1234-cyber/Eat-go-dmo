import { NextRequest, NextResponse } from 'next/server';
import * as L from '@/lib/logic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const view = q.get('view');
  try {
    let data: unknown;
    switch (view) {
      case 'table': data = L.tableState(Number(q.get('table')), q.get('device') || ''); break;
      case 'waiter': data = L.waiterState(q.get('k') || undefined); break;
      case 'team': data = L.teamState(); break;
      case 'me': data = L.meState(q.get('k') || ''); break;
      case 'payroll': data = L.payroll(q.get('month') || undefined); break;
      case 'kitchen': data = L.kitchenState(); break;
      case 'pos': data = L.posState(); break;
      case 'order': data = L.orderState(q.get('id') ? Number(q.get('id')) : undefined); break;
      case 'delivery': data = L.deliveryState(); break;
      case 'staff': data = L.staffState(); break;
      case 'inventory': data = L.inventoryState(); break;
      case 'club': data = L.clubState(); break;
      case 'admin': data = L.adminState(); break;
      case 'plan': data = L.planState(q.get('code') || ''); break;
      case 'plans': data = L.plansList(); break;
      case 'settings': data = { settings: L.getSettings() }; break;
      default: return NextResponse.json({ error: 'unknown view' }, { status: 400 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const msg = e instanceof L.UserError ? e.message : 'שגיאת שרת';
    if (!(e instanceof L.UserError)) console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

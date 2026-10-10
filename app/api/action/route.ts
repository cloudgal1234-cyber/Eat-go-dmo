import { NextRequest, NextResponse } from 'next/server';
import { doAction, UserError } from '@/lib/logic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { type, ...payload } = await req.json();
    return NextResponse.json(doAction(type, payload));
  } catch (e) {
    const msg = e instanceof UserError ? e.message : 'שגיאת שרת';
    if (!(e instanceof UserError)) console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

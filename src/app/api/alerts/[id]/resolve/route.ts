import { NextRequest, NextResponse } from 'next/server';
import { alertOperations } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    alertOperations.resolve(id);
    return NextResponse.json({ message: 'Alert resolved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

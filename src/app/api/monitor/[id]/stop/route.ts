import { NextRequest, NextResponse } from 'next/server';
import { monitorService } from '@/lib/monitor-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    monitorService.stopMonitoring(id);
    return NextResponse.json({ message: 'Monitoring stopped successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

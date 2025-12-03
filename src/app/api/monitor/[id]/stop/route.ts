import { NextRequest, NextResponse } from 'next/server';
import { monitorService } from '@/lib/monitor-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    monitorService.stopMonitoring(id);
    return NextResponse.json({ message: 'Monitoring stopped successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

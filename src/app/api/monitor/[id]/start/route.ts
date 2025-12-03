import { NextRequest, NextResponse } from 'next/server';
import { monitorService } from '@/lib/monitor-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    const success = await monitorService.startMonitoring(id);

    if (success) {
      return NextResponse.json({ message: 'Monitoring started successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to start monitoring' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

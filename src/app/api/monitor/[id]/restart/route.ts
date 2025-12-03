import { NextRequest, NextResponse } from 'next/server';
import { monitorService } from '@/lib/monitor-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const success = await monitorService.restartMonitoring(id);

    if (success) {
      return NextResponse.json({ message: 'Monitoring restarted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to restart monitoring' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

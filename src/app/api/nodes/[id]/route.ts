import { NextRequest, NextResponse } from 'next/server';
import { nodeOperations } from '@/lib/database';
import { monitorService } from '@/lib/monitor-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    const node = nodeOperations.getById(id);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const status = monitorService.getMonitorStatus(id);

    return NextResponse.json({
      ...node,
      isMonitoring: status.connected
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    const body = await request.json();

    nodeOperations.update(id, body);

    // Restart monitoring with new settings
    await monitorService.restartMonitoring(id);

    return NextResponse.json({ message: 'Node updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    // Stop monitoring first
    monitorService.stopMonitoring(id);

    nodeOperations.delete(id);

    return NextResponse.json({ message: 'Node deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

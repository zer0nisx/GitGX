import { NextRequest, NextResponse } from 'next/server';
import { nodeOperations } from '@/lib/database';
import { monitorService } from '@/lib/monitor-service';

export async function GET() {
  try {
    const nodes = nodeOperations.getAll();
    const statuses = monitorService.getAllMonitorStatuses();

    const nodesWithStatus = nodes.map(node => {
      const status = statuses.find(s => s.nodeId === node.id);
      return {
        ...node,
        isMonitoring: status?.connected || false
      };
    });

    return NextResponse.json(nodesWithStatus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ip, username, password, port } = body;

    if (!name || !ip || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const nodeId = nodeOperations.create({
      name,
      ip,
      username,
      password,
      port: port || 8728
    });

    // Auto-start monitoring
    await monitorService.startMonitoring(Number(nodeId));

    return NextResponse.json({ id: nodeId, message: 'Node created successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

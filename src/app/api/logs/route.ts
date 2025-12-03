import { NextRequest, NextResponse } from 'next/server';
import { logOperations } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const limit = parseInt(searchParams.get('limit') || '100');

    let logs;
    if (nodeId) {
      logs = logOperations.getByNodeId(parseInt(nodeId), limit);
    } else {
      logs = logOperations.getRecent(limit);
    }

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

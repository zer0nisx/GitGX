import { NextRequest, NextResponse } from 'next/server';
import { alertOperations } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');

    let alerts;
    if (nodeId) {
      alerts = alertOperations.getByNodeId(parseInt(nodeId));
    } else {
      alerts = alertOperations.getActive();
    }

    return NextResponse.json(alerts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

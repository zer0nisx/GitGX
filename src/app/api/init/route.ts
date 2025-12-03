import { NextResponse } from 'next/server';
import { monitorService } from '@/lib/monitor-service';

// Initialize socket.io with monitor service
if (typeof global.io !== 'undefined') {
  monitorService.setSocketIO(global.io);
}

export async function GET() {
  return NextResponse.json({
    status: 'initialized',
    socketio: typeof global.io !== 'undefined'
  });
}

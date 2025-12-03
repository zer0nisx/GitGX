import { NextRequest, NextResponse } from 'next/server';
import { settingsOperations } from '@/lib/database';

export async function GET() {
  try {
    const settings = settingsOperations.getAll();

    // Don't expose sensitive data fully
    const safeSettings = settings.map(s => ({
      ...s,
      value: s.key.includes('token') || s.key.includes('password')
        ? '***'
        : s.value
    }));

    return NextResponse.json(safeSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    settingsOperations.set(key, value);
    return NextResponse.json({ message: 'Setting saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

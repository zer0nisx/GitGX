import { NextResponse } from 'next/server';
import { telegramNotifier } from '@/lib/telegram-bot';

export async function POST() {
  try {
    const result = await telegramNotifier.testConnection();

    if (result.success) {
      return NextResponse.json({ message: result.message });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

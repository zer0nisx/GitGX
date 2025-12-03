import { NextRequest, NextResponse } from 'next/server';
import { telegramNotifier } from '@/lib/telegram-bot';

export async function GET() {
  try {
    const config = telegramNotifier.getConfig();
    return NextResponse.json({
      configured: telegramNotifier.isEnabled(),
      hasToken: !!config.token,
      hasChatId: !!config.chatId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, chatId } = body;

    if (!token || !chatId) {
      return NextResponse.json(
        { error: 'Token and Chat ID are required' },
        { status: 400 }
      );
    }

    const success = telegramNotifier.initialize(token, chatId);

    if (success) {
      return NextResponse.json({ message: 'Telegram configured successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to initialize Telegram bot' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

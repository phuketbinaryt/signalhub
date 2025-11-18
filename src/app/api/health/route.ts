import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check environment variables
    const envCheck = {
      database: !!process.env.DATABASE_URL,
      nextAuth: !!process.env.NEXTAUTH_SECRET,
      googleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      webhookSecret: !!process.env.WEBHOOK_SECRET,
      discord: !!process.env.DISCORD_WEBHOOK_URL,
      telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      externalDashboard: !!process.env.EXTERNAL_DASHBOARD_URL,
    };

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: envCheck,
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Calculate next session start (18:00 ET)
function getNextSessionStart(): Date {
  const now = new Date();

  // Convert to ET
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentHour = etTime.getHours();
  const currentMinutes = etTime.getMinutes();

  // Create a date for today at 18:00 ET
  const sessionStart = new Date(etTime);
  sessionStart.setHours(18, 0, 0, 0);

  // If it's before 18:00, the next session is today at 18:00
  // If it's after 18:00, the next session is tomorrow at 18:00
  if (currentHour > 18 || (currentHour === 18 && currentMinutes > 0)) {
    sessionStart.setDate(sessionStart.getDate() + 1);
  }

  // Skip weekends (Saturday session starts Sunday 18:00, Friday session runs through Sunday)
  const dayOfWeek = sessionStart.getDay();
  if (dayOfWeek === 6) {
    // Saturday - next session is Sunday 18:00
    sessionStart.setDate(sessionStart.getDate() + 1);
  }

  // Convert back to UTC for storage
  // We need to calculate the offset between local and ET
  const etOffset = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' });
  const isDST = etOffset.includes('EDT');
  const offsetHours = isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5

  const utcSessionStart = new Date(sessionStart);
  utcSessionStart.setHours(utcSessionStart.getHours() + offsetHours);

  return utcSessionStart;
}

// POST - Toggle pause for a config
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid config ID' },
        { status: 400 }
      );
    }

    // Get current config
    const config = await prisma.pickMyTradeConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    // Check if currently paused
    const isPaused = config.pausedUntil && new Date(config.pausedUntil) > new Date();

    let updatedConfig;
    if (isPaused) {
      // Resume - clear pausedUntil
      updatedConfig = await prisma.pickMyTradeConfig.update({
        where: { id },
        data: { pausedUntil: null },
      });
      console.log(`▶️ PickMyTrade [${config.name}]: Resumed forwarding`);
    } else {
      // Pause - set pausedUntil to next session start
      const nextSession = getNextSessionStart();
      updatedConfig = await prisma.pickMyTradeConfig.update({
        where: { id },
        data: { pausedUntil: nextSession },
      });
      const pausedUntilStr = nextSession.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      console.log(`⏸️ PickMyTrade [${config.name}]: Paused until ${pausedUntilStr} ET`);
    }

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      isPaused: !isPaused,
      pausedUntil: updatedConfig.pausedUntil,
    });
  } catch (error: any) {
    console.error('Error toggling pause:', error);
    return NextResponse.json(
      { error: 'Failed to toggle pause' },
      { status: 500 }
    );
  }
}

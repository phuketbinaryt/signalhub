import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const strategy = searchParams.get('strategy');
    const status = searchParams.get('status');
    const period = searchParams.get('period');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query filters
    const where: any = {};
    if (ticker) {
      where.ticker = ticker;
    }
    if (strategy) {
      where.strategy = strategy;
    }
    if (status) {
      where.status = status;
    }

    // Add time period filter
    if (period && period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      let endDate: Date | undefined;

      switch (period) {
        case 'daily': {
          // Trading session: 18:00 NY time to 17:00 NY time
          // Convert current time to NY timezone
          const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const currentHour = nyTime.getHours();
          const currentMinutes = nyTime.getMinutes();

          // Create session start date in NY timezone
          const sessionStart = new Date(nyTime);
          sessionStart.setHours(18, 0, 0, 0);

          // If current time is before 17:00 NY, session started yesterday at 18:00
          // If current time is after 17:00 NY, session started today at 18:00
          if (currentHour < 17 || (currentHour === 17 && currentMinutes === 0)) {
            sessionStart.setDate(sessionStart.getDate() - 1);
          }

          // Convert back to UTC for database query
          startDate = new Date(sessionStart.toLocaleString('en-US', { timeZone: 'UTC' }));
          break;
        }
        case 'previous_session': {
          // Previous trading session: goes back one full session
          const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const currentHour = nyTime.getHours();
          const currentMinutes = nyTime.getMinutes();

          // Calculate current session start
          const currentSessionStart = new Date(nyTime);
          currentSessionStart.setHours(18, 0, 0, 0);
          if (currentHour < 17 || (currentHour === 17 && currentMinutes === 0)) {
            currentSessionStart.setDate(currentSessionStart.getDate() - 1);
          }

          // Previous session start is 24 hours before current session start
          const prevSessionStart = new Date(currentSessionStart);
          prevSessionStart.setDate(prevSessionStart.getDate() - 1);

          // Previous session end is current session start
          const prevSessionEnd = new Date(currentSessionStart);

          // Convert to UTC for database query
          startDate = new Date(prevSessionStart.toLocaleString('en-US', { timeZone: 'UTC' }));
          endDate = new Date(prevSessionEnd.toLocaleString('en-US', { timeZone: 'UTC' }));
          break;
        }
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      if (endDate) {
        where.openedAt = {
          gte: startDate,
          lt: endDate,
        };
      } else {
        where.openedAt = {
          gte: startDate,
        };
      }
    }

    // Fetch trades with events
    const trades = await prisma.trade.findMany({
      where,
      include: {
        events: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.trade.count({ where });

    // Calculate summary statistics
    const stats = await calculateStats(where);

    return NextResponse.json({
      trades,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function calculateStats(where: any) {
  // Get all trades matching the filter
  const allTrades = await prisma.trade.findMany({
    where,
  });

  const closedTrades = allTrades.filter((t) => t.status === 'closed');
  const openTrades = allTrades.filter((t) => t.status === 'open');

  const totalTrades = allTrades.length;
  const totalClosed = closedTrades.length;
  const totalOpen = openTrades.length;

  // Calculate P&L stats
  const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter((t) => (t.pnl || 0) < 0);

  const winRate = totalClosed > 0 ? (winningTrades.length / totalClosed) * 100 : 0;
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length
    : 0;

  // Group by ticker
  const tickerStats: any = {};
  allTrades.forEach((trade) => {
    if (!tickerStats[trade.ticker]) {
      tickerStats[trade.ticker] = {
        ticker: trade.ticker,
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalPnl: 0,
        wins: 0,
        losses: 0,
        strategies: new Set<string>(),
      };
    }

    const stat = tickerStats[trade.ticker];
    stat.totalTrades++;

    // Track strategies used for this ticker
    if (trade.strategy) {
      stat.strategies.add(trade.strategy);
    }

    if (trade.status === 'open') {
      stat.openTrades++;
    } else {
      stat.closedTrades++;
      stat.totalPnl += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) {
        stat.wins++;
      } else if ((trade.pnl || 0) < 0) {
        stat.losses++;
      }
    }
  });

  const byTicker = Object.values(tickerStats)
    .map((stat: any) => ({
      ...stat,
      strategies: Array.from(stat.strategies).sort(),
    }))
    .sort((a: any, b: any) => b.totalTrades - a.totalTrades);

  return {
    overall: {
      totalTrades,
      openTrades: totalOpen,
      closedTrades: totalClosed,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
    },
    byTicker,
  };
}

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

      // Helper: get NY time components from a UTC date
      function getNYParts(date: Date) {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        }).formatToParts(date);
        const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
        return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
      }

      // Helper: create a UTC date from NY time components
      // Uses a binary search approach: create a date, check its NY representation, adjust
      function fromNY(year: number, month: number, day: number, hour: number): Date {
        // Start with a rough UTC estimate
        const rough = new Date(Date.UTC(year, month - 1, day, hour));
        const roughParts = getNYParts(rough);
        const diffHours = rough.getUTCHours() - roughParts.hour;
        // Adjust: if NY hour doesn't match, shift by the offset
        const adjusted = new Date(Date.UTC(year, month - 1, day, hour + diffHours));
        return adjusted;
      }

      switch (period) {
        case 'daily': {
          // Trading session: 18:00 NY to 16:00 NY next day
          const ny = getNYParts(now);
          const totalMinutes = ny.hour * 60 + ny.minute;

          // Before 16:00 NY → session started yesterday at 18:00
          // Between 16:00-17:59 NY → session hasn't started yet, show previous session (yesterday 18:00)
          // 18:00+ NY → session started today at 18:00
          if (totalMinutes < 18 * 60) {
            // Before 18:00 NY: current session started yesterday at 18:00
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const nyYesterday = getNYParts(yesterday);
            startDate = fromNY(nyYesterday.year, nyYesterday.month, nyYesterday.day, 18);
          } else {
            // 18:00+ NY: current session started today at 18:00
            startDate = fromNY(ny.year, ny.month, ny.day, 18);
          }
          // End is 16:00 NY the day after session start
          const nextDay = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          const nyNext = getNYParts(nextDay);
          endDate = fromNY(nyNext.year, nyNext.month, nyNext.day, 16);
          break;
        }
        case 'previous_session': {
          // Previous trading session
          const ny = getNYParts(now);
          const totalMinutes = ny.hour * 60 + ny.minute;

          let currentSessionStart: Date;
          if (totalMinutes < 18 * 60) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const nyYesterday = getNYParts(yesterday);
            currentSessionStart = fromNY(nyYesterday.year, nyYesterday.month, nyYesterday.day, 18);
          } else {
            currentSessionStart = fromNY(ny.year, ny.month, ny.day, 18);
          }

          // Previous session: one day before current session
          const prevStart = new Date(currentSessionStart.getTime() - 24 * 60 * 60 * 1000);
          const nyPrev = getNYParts(prevStart);
          startDate = fromNY(nyPrev.year, nyPrev.month, nyPrev.day, 18);

          // Ends at 16:00 NY the next day
          const prevNextDay = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          const nyPrevNext = getNYParts(prevNextDay);
          endDate = fromNY(nyPrevNext.year, nyPrevNext.month, nyPrevNext.day, 16);
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

  // Group by strategy
  const strategyStats: any = {};
  allTrades.forEach((trade) => {
    const strategyKey = trade.strategy || '(No Strategy)';
    if (!strategyStats[strategyKey]) {
      strategyStats[strategyKey] = {
        strategy: strategyKey,
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalPnl: 0,
        totalContracts: 0,
        wins: 0,
        losses: 0,
        tickers: new Set<string>(),
      };
    }

    const stat = strategyStats[strategyKey];
    stat.totalTrades++;
    stat.totalContracts += trade.quantity || 1;
    stat.tickers.add(trade.ticker);

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

  const byStrategy = Object.values(strategyStats)
    .map((stat: any) => ({
      ...stat,
      tickers: Array.from(stat.tickers).sort(),
      winRate: stat.closedTrades > 0 ? (stat.wins / stat.closedTrades) * 100 : 0,
    }))
    .sort((a: any, b: any) => b.totalPnl - a.totalPnl);

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
    byStrategy,
  };
}

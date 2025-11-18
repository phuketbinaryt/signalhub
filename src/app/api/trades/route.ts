import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query filters
    const where: any = {};
    if (ticker) {
      where.ticker = ticker;
    }
    if (status) {
      where.status = status;
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
      };
    }

    const stat = tickerStats[trade.ticker];
    stat.totalTrades++;

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

  const byTicker = Object.values(tickerStats).sort(
    (a: any, b: any) => b.totalTrades - a.totalTrades
  );

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

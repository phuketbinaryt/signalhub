import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Retrieve all unique tickers with their strategies
export async function GET() {
  try {
    // Get all trades with ticker and strategy
    const trades = await prisma.trade.findMany({
      select: {
        ticker: true,
        strategy: true,
      },
      where: {
        strategy: {
          not: null,
        },
      },
      orderBy: {
        ticker: 'asc',
      },
    });

    // Group strategies by ticker
    const tickerStrategies: Record<string, Set<string>> = {};

    trades.forEach((trade) => {
      if (!tickerStrategies[trade.ticker]) {
        tickerStrategies[trade.ticker] = new Set();
      }
      if (trade.strategy) {
        tickerStrategies[trade.ticker].add(trade.strategy);
      }
    });

    // Convert to array format
    const result = Object.entries(tickerStrategies).map(([ticker, strategies]) => ({
      ticker,
      strategies: Array.from(strategies).sort(),
    }));

    // Also return simple ticker list for backward compatibility
    const tickers = result.map((t) => t.ticker);

    return NextResponse.json({
      tickers,
      tickerStrategies: result,
    });
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickers' },
      { status: 500 }
    );
  }
}

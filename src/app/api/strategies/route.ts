import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    // Build query filters
    const where: any = {};

    // Add time period filter
    if (period && period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      let endDate: Date | undefined;

      switch (period) {
        case 'daily': {
          const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const currentHour = nyTime.getHours();
          const currentMinutes = nyTime.getMinutes();

          const sessionStart = new Date(nyTime);
          sessionStart.setHours(18, 0, 0, 0);

          if (currentHour < 17 || (currentHour === 17 && currentMinutes === 0)) {
            sessionStart.setDate(sessionStart.getDate() - 1);
          }

          startDate = new Date(sessionStart.toLocaleString('en-US', { timeZone: 'UTC' }));
          break;
        }
        case 'previous_session': {
          const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const currentHour = nyTime.getHours();
          const currentMinutes = nyTime.getMinutes();

          const currentSessionStart = new Date(nyTime);
          currentSessionStart.setHours(18, 0, 0, 0);
          if (currentHour < 17 || (currentHour === 17 && currentMinutes === 0)) {
            currentSessionStart.setDate(currentSessionStart.getDate() - 1);
          }

          const prevSessionStart = new Date(currentSessionStart);
          prevSessionStart.setDate(prevSessionStart.getDate() - 1);

          const prevSessionEnd = new Date(currentSessionStart);

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

    // Fetch all trades with strategy
    const allTrades = await prisma.trade.findMany({
      where: {
        ...where,
        strategy: { not: null },
      },
      orderBy: {
        closedAt: 'asc',
      },
    });

    // Group by strategy and calculate stats
    const strategyStats: Record<string, any> = {};

    allTrades.forEach((trade) => {
      const strategy = trade.strategy || 'Unknown';

      if (!strategyStats[strategy]) {
        strategyStats[strategy] = {
          strategy,
          totalTrades: 0,
          openTrades: 0,
          closedTrades: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0,
          winningPnl: 0,
          losingPnl: 0,
          closedTradesOrdered: [], // For drawdown calculation
          tickers: new Set<string>(),
          totalRR: 0,
          rrCount: 0,
        };
      }

      const stat = strategyStats[strategy];
      stat.totalTrades++;
      stat.tickers.add(trade.ticker);

      if (trade.status === 'open') {
        stat.openTrades++;
      } else {
        stat.closedTrades++;
        const pnl = trade.pnl || 0;
        stat.totalPnl += pnl;

        if (pnl > 0) {
          stat.wins++;
          stat.winningPnl += pnl;
        } else if (pnl < 0) {
          stat.losses++;
          stat.losingPnl += pnl;
        }

        // Calculate risk-to-reward ratio if SL and TP are set
        if (trade.stopLoss && trade.takeProfit) {
          const risk = Math.abs(trade.entryPrice - trade.stopLoss);
          const reward = Math.abs(trade.takeProfit - trade.entryPrice);
          if (risk > 0) {
            stat.totalRR += reward / risk;
            stat.rrCount++;
          }
        }

        // Store for drawdown calculation (only closed trades with closedAt)
        if (trade.closedAt) {
          stat.closedTradesOrdered.push({
            closedAt: trade.closedAt,
            pnl: pnl,
          });
        }
      }
    });

    // Calculate derived stats for each strategy
    const strategies = Object.values(strategyStats).map((stat: any) => {
      const winRate = stat.closedTrades > 0
        ? (stat.wins / stat.closedTrades) * 100
        : 0;

      const avgWin = stat.wins > 0
        ? stat.winningPnl / stat.wins
        : 0;

      const avgLoss = stat.losses > 0
        ? stat.losingPnl / stat.losses
        : 0;

      const avgRR = stat.rrCount > 0
        ? stat.totalRR / stat.rrCount
        : 0;

      // Calculate max drawdown
      // Sort closed trades by date
      const sortedTrades = stat.closedTradesOrdered.sort(
        (a: any, b: any) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
      );

      let cumulativePnl = 0;
      let peak = 0;
      let maxDrawdown = 0;
      let tradesSincePeak = 0;
      let maxDrawdownTrades = 0;

      sortedTrades.forEach((trade: any) => {
        cumulativePnl += trade.pnl;
        if (cumulativePnl > peak) {
          peak = cumulativePnl;
          tradesSincePeak = 0;
        }
        tradesSincePeak++;
        const drawdown = peak - cumulativePnl;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownTrades = tradesSincePeak;
        }
      });

      return {
        strategy: stat.strategy,
        totalTrades: stat.totalTrades,
        openTrades: stat.openTrades,
        closedTrades: stat.closedTrades,
        wins: stat.wins,
        losses: stat.losses,
        winRate: parseFloat(winRate.toFixed(2)),
        totalPnl: parseFloat(stat.totalPnl.toFixed(2)),
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        maxDrawdownTrades,
        avgRR: parseFloat(avgRR.toFixed(2)),
        tickers: Array.from(stat.tickers).sort(),
      };
    });

    // Sort by total P&L descending
    strategies.sort((a, b) => b.totalPnl - a.totalPnl);

    return NextResponse.json({
      strategies,
    });
  } catch (error) {
    console.error('Error fetching strategy stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

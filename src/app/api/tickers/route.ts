import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Retrieve all unique tickers
export async function GET() {
  try {
    const trades = await prisma.trade.findMany({
      select: {
        ticker: true,
      },
      distinct: ['ticker'],
      orderBy: {
        ticker: 'asc',
      },
    });

    const tickers = trades.map((t) => t.ticker);

    return NextResponse.json({ tickers });
  } catch (error) {
    console.error('Error fetching tickers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickers' },
      { status: 500 }
    );
  }
}

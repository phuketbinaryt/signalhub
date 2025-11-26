import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Retrieve all PickMyTrade configs
export async function GET() {
  try {
    const configs = await prisma.pickMyTradeConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Error fetching PickMyTrade configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configs' },
      { status: 500 }
    );
  }
}

// POST - Create new PickMyTrade config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, enabled, webhookUrls, strategyFilters, contractMapping, token, accountId, riskPercentage, roundingMode } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Config name is required' },
        { status: 400 }
      );
    }

    if (!token || !accountId) {
      return NextResponse.json(
        { error: 'Token and Account ID are required' },
        { status: 400 }
      );
    }

    if (!webhookUrls || webhookUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one webhook URL is required' },
        { status: 400 }
      );
    }

    // Create new config
    const config = await prisma.pickMyTradeConfig.create({
      data: {
        name: name.trim(),
        enabled: enabled ?? true,
        webhookUrls: webhookUrls || [],
        allowedTickers: [], // Deprecated, kept for compatibility
        strategyFilters: strategyFilters || {},
        contractMapping: contractMapping || {},
        token,
        accountId,
        riskPercentage: riskPercentage ?? 100,
        roundingMode: roundingMode ?? 'down',
      },
    });

    console.log(`✅ PickMyTrade config created: ${config.name}`);

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error creating PickMyTrade config:', error);
    return NextResponse.json(
      { error: 'Failed to create config' },
      { status: 500 }
    );
  }
}

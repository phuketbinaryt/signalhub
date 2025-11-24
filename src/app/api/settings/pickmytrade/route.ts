import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Retrieve PickMyTrade settings
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { key: 'pickmytrade' },
    });

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        enabled: false,
        webhookUrls: [],
        allowedTickers: [],
        token: '',
        accountId: '',
      });
    }

    return NextResponse.json(settings.value);
  } catch (error) {
    console.error('Error fetching PickMyTrade settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Update PickMyTrade settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { enabled, webhookUrls, allowedTickers, token, accountId } = body;

    // Validate required fields
    if (enabled && (!token || !accountId)) {
      return NextResponse.json(
        { error: 'Token and Account ID are required when enabled' },
        { status: 400 }
      );
    }

    if (enabled && (!webhookUrls || webhookUrls.length === 0)) {
      return NextResponse.json(
        { error: 'At least one webhook URL is required when enabled' },
        { status: 400 }
      );
    }

    // Upsert settings
    const settings = await prisma.settings.upsert({
      where: { key: 'pickmytrade' },
      update: {
        value: {
          enabled: enabled || false,
          webhookUrls: webhookUrls || [],
          allowedTickers: allowedTickers || [],
          token: token || '',
          accountId: accountId || '',
        },
      },
      create: {
        key: 'pickmytrade',
        value: {
          enabled: enabled || false,
          webhookUrls: webhookUrls || [],
          allowedTickers: allowedTickers || [],
          token: token || '',
          accountId: accountId || '',
        },
      },
    });

    console.log('✅ PickMyTrade settings updated');

    return NextResponse.json(settings.value);
  } catch (error) {
    console.error('Error updating PickMyTrade settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

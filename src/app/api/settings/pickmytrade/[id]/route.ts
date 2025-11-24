import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT - Update specific PickMyTrade config
export async function PUT(
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

    const body = await request.json();
    const { name, enabled, webhookUrls, allowedTickers, token, accountId } = body;

    // Validate required fields
    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Config name is required' },
        { status: 400 }
      );
    }

    if (token !== undefined && !token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (accountId !== undefined && !accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (webhookUrls !== undefined && (!webhookUrls || webhookUrls.length === 0)) {
      return NextResponse.json(
        { error: 'At least one webhook URL is required' },
        { status: 400 }
      );
    }

    // Update config
    const config = await prisma.pickMyTradeConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(enabled !== undefined && { enabled }),
        ...(webhookUrls !== undefined && { webhookUrls }),
        ...(allowedTickers !== undefined && { allowedTickers }),
        ...(token !== undefined && { token }),
        ...(accountId !== undefined && { accountId }),
      },
    });

    console.log(`✅ PickMyTrade config updated: ${config.name}`);

    return NextResponse.json(config);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    console.error('Error updating PickMyTrade config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific PickMyTrade config
export async function DELETE(
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

    await prisma.pickMyTradeConfig.delete({
      where: { id },
    });

    console.log(`✅ PickMyTrade config deleted: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    console.error('Error deleting PickMyTrade config:', error);
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    );
  }
}

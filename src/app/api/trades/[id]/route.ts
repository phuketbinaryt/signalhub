import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH - Complete/Close a trade manually
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tradeId = parseInt(params.id);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { error: 'Invalid trade ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { exitPrice, pnl, exitReason } = body;

    // Validate required fields
    if (exitPrice === undefined || pnl === undefined) {
      return NextResponse.json(
        { error: 'Exit price and P&L are required' },
        { status: 400 }
      );
    }

    // Check if trade exists
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      );
    }

    // Calculate P&L percentage
    const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

    // Update the trade
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'closed',
        exitPrice: parseFloat(exitPrice),
        pnl: parseFloat(pnl),
        pnlPercent,
        exitReason: exitReason || 'manual',
        closedAt: new Date(),
      },
    });

    console.log(`✅ Trade manually completed [ID: ${tradeId}] | Exit: ${exitPrice} | P&L: $${pnl} | Reason: ${exitReason || 'manual'}`);

    return NextResponse.json({
      success: true,
      trade: updatedTrade,
    });
  } catch (error) {
    console.error('Error completing trade:', error);
    return NextResponse.json(
      { error: 'Failed to complete trade' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tradeId = parseInt(params.id);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { error: 'Invalid trade ID' },
        { status: 400 }
      );
    }

    // Check if trade exists
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      );
    }

    // Delete the trade (cascade will delete related events)
    await prisma.trade.delete({
      where: { id: tradeId },
    });

    return NextResponse.json(
      { success: true, message: 'Trade deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json(
      { error: 'Failed to delete trade' },
      { status: 500 }
    );
  }
}

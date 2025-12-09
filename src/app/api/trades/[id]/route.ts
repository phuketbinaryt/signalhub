import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH - Edit a trade (flexible update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { error: 'Invalid trade ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

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

    // Build update data - only include fields that are provided
    const updateData: any = {};

    if (body.exitPrice !== undefined) {
      updateData.exitPrice = body.exitPrice === null ? null : parseFloat(body.exitPrice);
    }

    if (body.exitReason !== undefined) {
      updateData.exitReason = body.exitReason;
    }

    if (body.pnl !== undefined) {
      updateData.pnl = body.pnl === null ? null : parseFloat(body.pnl);
    }

    if (body.pnlPercent !== undefined) {
      updateData.pnlPercent = body.pnlPercent === null ? null : parseFloat(body.pnlPercent);
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
      // If closing a trade, set closedAt if not already set
      if (body.status === 'closed' && !trade.closedAt) {
        updateData.closedAt = new Date();
      }
      // If reopening a trade, clear exit data
      if (body.status === 'open') {
        updateData.closedAt = null;
        updateData.exitPrice = null;
        updateData.exitReason = null;
        updateData.pnl = null;
        updateData.pnlPercent = null;
      }
    }

    if (body.entryPrice !== undefined) {
      updateData.entryPrice = parseFloat(body.entryPrice);
    }

    if (body.takeProfit !== undefined) {
      updateData.takeProfit = body.takeProfit === null ? null : parseFloat(body.takeProfit);
    }

    if (body.stopLoss !== undefined) {
      updateData.stopLoss = body.stopLoss === null ? null : parseFloat(body.stopLoss);
    }

    if (body.quantity !== undefined) {
      updateData.quantity = parseFloat(body.quantity);
    }

    if (body.direction !== undefined) {
      updateData.direction = body.direction;
    }

    // Update the trade
    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: updateData,
    });

    console.log(`✏️ Trade edited [ID: ${tradeId}]:`, updateData);

    return NextResponse.json({
      success: true,
      trade: updatedTrade,
    });
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json(
      { error: 'Failed to update trade' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id);

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

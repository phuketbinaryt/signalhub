import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchForwarders } from '@/lib/forwarders';

interface WebhookPayload {
  secret?: string;
  action: 'entry' | 'take_profit' | 'stop_loss';
  ticker: string;
  price: number;
  direction?: 'long' | 'short';
  takeProfit?: number;
  stopLoss?: number;
  quantity?: number;
  content?: string; // For text-based format
}

// Parse text-based webhook format
function parseTextWebhook(content: string): Partial<WebhookPayload> | null {
  try {
    // Entry signals
    if (content.includes('BUY Signal') && !content.includes('SKIPPED')) {
      const tickerMatch = content.match(/^[^\s]+\s+(\w+)\s+BUY/);
      const entryMatch = content.match(/Entry:\s*([\d.]+)/);
      const slMatch = content.match(/SL:\s*([\d.]+)/);
      const tpMatch = content.match(/TP:\s*([\d.]+)/);
      const contractsMatch = content.match(/Contracts:\s*(\d+)/);

      if (tickerMatch && entryMatch) {
        return {
          action: 'entry',
          ticker: tickerMatch[1],
          price: parseFloat(entryMatch[1]),
          direction: 'long',
          stopLoss: slMatch ? parseFloat(slMatch[1]) : undefined,
          takeProfit: tpMatch ? parseFloat(tpMatch[1]) : undefined,
          quantity: contractsMatch ? parseInt(contractsMatch[1]) : 1,
        };
      }
    }

    if (content.includes('SELL Signal') && !content.includes('SKIPPED')) {
      const tickerMatch = content.match(/^[^\s]+\s+(\w+)\s+SELL/);
      const entryMatch = content.match(/Entry:\s*([\d.]+)/);
      const slMatch = content.match(/SL:\s*([\d.]+)/);
      const tpMatch = content.match(/TP:\s*([\d.]+)/);
      const contractsMatch = content.match(/Contracts:\s*(\d+)/);

      if (tickerMatch && entryMatch) {
        return {
          action: 'entry',
          ticker: tickerMatch[1],
          price: parseFloat(entryMatch[1]),
          direction: 'short',
          stopLoss: slMatch ? parseFloat(slMatch[1]) : undefined,
          takeProfit: tpMatch ? parseFloat(tpMatch[1]) : undefined,
          quantity: contractsMatch ? parseInt(contractsMatch[1]) : 1,
        };
      }
    }

    // Take Profit
    if (content.includes('Take Profit HIT')) {
      const tickerMatch = content.match(/^[^\s]+\s+(\w+)\s+(?:BUY|SELL)/);
      const exitMatch = content.match(/Exit:\s*([\d.]+)/);

      if (tickerMatch && exitMatch) {
        return {
          action: 'take_profit',
          ticker: tickerMatch[1],
          price: parseFloat(exitMatch[1]),
        };
      }
    }

    // Stop Loss
    if (content.includes('Stop Loss HIT')) {
      const tickerMatch = content.match(/^[^\s]+\s+(\w+)\s+(?:BUY|SELL)/);
      const exitMatch = content.match(/Exit:\s*([\d.]+)/);

      if (tickerMatch && exitMatch) {
        return {
          action: 'stop_loss',
          ticker: tickerMatch[1],
          price: parseFloat(exitMatch[1]),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing text webhook:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    let rawPayload: any = await request.json();
    let payload: WebhookPayload;

    // Check if this is a text-based webhook (has "content" field)
    if (rawPayload.content && typeof rawPayload.content === 'string') {
      console.log('Received text-based webhook:', rawPayload.content);
      const parsed = parseTextWebhook(rawPayload.content);

      if (!parsed) {
        return NextResponse.json(
          { error: 'Unable to parse webhook content' },
          { status: 400 }
        );
      }

      payload = {
        ...parsed,
        secret: rawPayload.secret,
      } as WebhookPayload;
    } else {
      // Standard JSON format
      payload = rawPayload;
    }

    // Validate webhook secret
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret && payload.secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!payload.action || !payload.ticker || !payload.price) {
      return NextResponse.json(
        { error: 'Missing required fields: action, ticker, price' },
        { status: 400 }
      );
    }

    console.log('Received webhook:', payload);

    // Process based on action type
    let trade;
    switch (payload.action) {
      case 'entry':
        trade = await handleEntry(payload);
        break;
      case 'take_profit':
        trade = await handleTakeProfit(payload);
        break;
      case 'stop_loss':
        trade = await handleStopLoss(payload);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${payload.action}` },
          { status: 400 }
        );
    }

    // Forward to all configured destinations (non-blocking)
    dispatchForwarders(payload).catch((error) => {
      console.error('Error in webhook forwarding:', error);
    });

    return NextResponse.json({
      success: true,
      message: `${payload.action} processed successfully`,
      tradeId: trade?.id,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function handleEntry(payload: WebhookPayload) {
  const { ticker, price, direction, takeProfit, stopLoss, quantity } = payload;

  // Create new trade
  const trade = await prisma.trade.create({
    data: {
      ticker,
      direction: direction || 'long',
      entryPrice: price,
      takeProfit,
      stopLoss,
      quantity: quantity || 1.0,
      status: 'open',
      events: {
        create: {
          eventType: 'entry',
          price,
          rawPayload: payload as any,
        },
      },
    },
    include: {
      events: true,
    },
  });

  console.log('Created new trade:', trade.id);
  return trade;
}

async function handleTakeProfit(payload: WebhookPayload) {
  const { ticker, price } = payload;

  // Find the most recent open trade for this ticker
  const openTrade = await prisma.trade.findFirst({
    where: {
      ticker,
      status: 'open',
    },
    orderBy: {
      openedAt: 'desc',
    },
  });

  if (!openTrade) {
    console.warn(`No open trade found for ticker ${ticker}, creating event anyway`);
    return null;
  }

  // Calculate P&L
  const pnl = calculatePnL(openTrade, price);
  const pnlPercent = ((price - openTrade.entryPrice) / openTrade.entryPrice) * 100;

  // Update trade and create event
  const trade = await prisma.trade.update({
    where: { id: openTrade.id },
    data: {
      status: 'closed',
      exitPrice: price,
      exitReason: 'take_profit',
      closedAt: new Date(),
      pnl,
      pnlPercent,
      events: {
        create: {
          eventType: 'take_profit',
          price,
          rawPayload: payload as any,
        },
      },
    },
    include: {
      events: true,
    },
  });

  console.log(`Closed trade ${trade.id} with take profit. P&L: ${pnl}`);
  return trade;
}

async function handleStopLoss(payload: WebhookPayload) {
  const { ticker, price } = payload;

  // Find the most recent open trade for this ticker
  const openTrade = await prisma.trade.findFirst({
    where: {
      ticker,
      status: 'open',
    },
    orderBy: {
      openedAt: 'desc',
    },
  });

  if (!openTrade) {
    console.warn(`No open trade found for ticker ${ticker}, creating event anyway`);
    return null;
  }

  // Calculate P&L
  const pnl = calculatePnL(openTrade, price);
  const pnlPercent = ((price - openTrade.entryPrice) / openTrade.entryPrice) * 100;

  // Update trade and create event
  const trade = await prisma.trade.update({
    where: { id: openTrade.id },
    data: {
      status: 'closed',
      exitPrice: price,
      exitReason: 'stop_loss',
      closedAt: new Date(),
      pnl,
      pnlPercent,
      events: {
        create: {
          eventType: 'stop_loss',
          price,
          rawPayload: payload as any,
        },
      },
    },
    include: {
      events: true,
    },
  });

  console.log(`Closed trade ${trade.id} with stop loss. P&L: ${pnl}`);
  return trade;
}

function calculatePnL(trade: any, exitPrice: number): number {
  const entryPrice = trade.entryPrice;
  const quantity = trade.quantity || 1;
  const direction = trade.direction;

  if (direction === 'long') {
    return (exitPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - exitPrice) * quantity;
  }
}

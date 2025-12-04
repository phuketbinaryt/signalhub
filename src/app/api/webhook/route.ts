import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchForwarders } from '@/lib/forwarders';
import { notifyClients } from '@/lib/sse';
import { sendPushNotification, formatTradeNotification } from '@/lib/webpush';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface WebhookPayload {
  secret?: string;
  action: 'entry' | 'take_profit' | 'stop_loss';
  ticker: string;
  price: number;
  direction?: 'long' | 'short';
  takeProfit?: number;
  stopLoss?: number;
  quantity?: number;
  pnl?: number; // P&L from TradingView
  strategy?: string; // Strategy name from TradingView
  content?: string; // For text-based format
}

// Parse text-based webhook format
function parseTextWebhook(content: string): Partial<WebhookPayload> | null {
  try {
    // Extract strategy name (common to all signal types)
    const strategyMatch = content.match(/Strategy:\s*([^\s|]+)/);
    const strategy = strategyMatch ? strategyMatch[1] : undefined;

    // Entry signals - regex supports optional emoji prefix (e.g., "🚀 CL1! BUY" or "CL1! BUY")
    if (content.includes('BUY Signal') && !content.includes('SKIPPED')) {
      const tickerMatch = content.match(/^(?:[^\s]+\s+)?([A-Z0-9!@#$%^&*_+\-=]+)\s+BUY/i);
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
          strategy,
        };
      }
    }

    if (content.includes('SELL Signal') && !content.includes('SKIPPED')) {
      const tickerMatch = content.match(/^(?:[^\s]+\s+)?([A-Z0-9!@#$%^&*_+\-=]+)\s+SELL/i);
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
          strategy,
        };
      }
    }

    // Take Profit - supports "Take Profit HIT" or "TP"
    const isTakeProfit = content.includes('Take Profit HIT') || / TP[| ]/.test(content) || content.endsWith(' TP');
    if (isTakeProfit) {
      const tickerMatch = content.match(/^(?:[^\s]+\s+)?([A-Z0-9!@#$%^&*_+\-=]+)\s+(?:BUY|SELL|LONG|SHORT)/i);
      const exitMatch = content.match(/Exit:\s*([\d.]+)/);
      const pnlMatch = content.match(/P&L:\s*\$?(-?[\d.]+)/);

      if (tickerMatch && exitMatch) {
        return {
          action: 'take_profit',
          ticker: tickerMatch[1],
          price: parseFloat(exitMatch[1]),
          pnl: pnlMatch ? parseFloat(pnlMatch[1]) : undefined,
          strategy,
        };
      }
    }

    // Stop Loss - supports "Stop Loss HIT" or "SL"
    const isStopLoss = content.includes('Stop Loss HIT') || / SL[| ]/.test(content) || content.endsWith(' SL');
    if (isStopLoss) {
      const tickerMatch = content.match(/^(?:[^\s]+\s+)?([A-Z0-9!@#$%^&*_+\-=]+)\s+(?:BUY|SELL|LONG|SHORT)/i);
      const exitMatch = content.match(/Exit:\s*([\d.]+)/);
      const pnlMatch = content.match(/P&L:\s*\$?(-?[\d.]+)/);

      if (tickerMatch && exitMatch) {
        return {
          action: 'stop_loss',
          ticker: tickerMatch[1],
          price: parseFloat(exitMatch[1]),
          pnl: pnlMatch ? parseFloat(pnlMatch[1]) : undefined,
          strategy,
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
    let payload: WebhookPayload;
    const contentType = request.headers.get('content-type') || '';

    // Read raw body
    const bodyText = await request.text();

    // Try to parse as JSON first
    let rawPayload: any;
    let isPlainText = false;

    try {
      rawPayload = JSON.parse(bodyText);
    } catch (e) {
      // Not valid JSON, treat as plain text
      isPlainText = true;
      console.log('Received plain text webhook:', bodyText);
    }

    if (isPlainText) {
      // Plain text format - parse directly
      const parsed = parseTextWebhook(bodyText);

      if (!parsed) {
        return NextResponse.json(
          { error: 'Unable to parse webhook content' },
          { status: 400 }
        );
      }

      payload = {
        ...parsed,
        secret: process.env.WEBHOOK_SECRET, // Use server secret for plain text
      } as WebhookPayload;
    } else if (rawPayload.content && typeof rawPayload.content === 'string') {
      // JSON with "content" field
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
        secret: rawPayload.secret || process.env.WEBHOOK_SECRET,
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
      console.error('❌ Invalid webhook - missing required fields:', {
        action: payload.action,
        ticker: payload.ticker,
        price: payload.price,
      });
      return NextResponse.json(
        { error: 'Missing required fields: action, ticker, price' },
        { status: 400 }
      );
    }

    console.log('📥 Webhook received:', {
      action: payload.action,
      ticker: payload.ticker,
      price: payload.price,
      direction: payload.direction,
      timestamp: new Date().toISOString(),
    });

    // Log to database
    logger.info('webhook', `Received ${payload.action} signal`, {
      ticker: payload.ticker,
      action: payload.action,
      direction: payload.direction,
      strategy: payload.strategy,
    });

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
    // Include trade data with P&L for TP/SL signals
    const forwardPayload = {
      ...payload,
      ...(trade && {
        tradeId: trade.id,
        pnl: trade.pnl,
        pnlPercent: trade.pnlPercent,
        entryPrice: trade.entryPrice,
      }),
    };

    dispatchForwarders(forwardPayload).catch((error) => {
      console.error('Error in webhook forwarding:', error);
    });

    // Send push notification
    sendPushNotification(formatTradeNotification(forwardPayload)).catch((error) => {
      console.error('Error sending push notification:', error);
    });

    // Notify connected dashboard clients about the new trade
    notifyClients({
      type: 'trade_update',
      action: payload.action,
      ticker: payload.ticker,
      tradeId: trade?.id,
    });

    return NextResponse.json({
      success: true,
      message: `${payload.action} processed successfully`,
      tradeId: trade?.id,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    logger.error('webhook', 'Webhook processing error', {
      error: (error as Error).message,
    });
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function handleEntry(payload: WebhookPayload) {
  const { ticker, price, direction, takeProfit, stopLoss, quantity, strategy } = payload;

  console.log(`📥 Entry Payload - Ticker: ${ticker}, Price: ${price}, Direction: ${direction}, Quantity: ${quantity}, Strategy: ${strategy || 'N/A'}, Type: ${typeof quantity}`);

  // Deduplication: Check if a similar trade was created in the last 60 seconds
  const recentCutoff = new Date(Date.now() - 60 * 1000); // 60 seconds ago
  const existingTrade = await prisma.trade.findFirst({
    where: {
      ticker,
      direction: direction || 'long',
      strategy: strategy || null,
      status: 'open',
      openedAt: { gte: recentCutoff },
    },
    orderBy: { openedAt: 'desc' },
  });

  if (existingTrade) {
    console.log(`⚠️ Duplicate entry detected - Trade ID ${existingTrade.id} already exists for ${ticker}/${strategy} (created ${Math.round((Date.now() - existingTrade.openedAt.getTime()) / 1000)}s ago)`);
    logger.warn('webhook', 'Duplicate entry skipped', {
      ticker,
      strategy,
      existingTradeId: existingTrade.id,
    });
    return existingTrade;
  }

  // Create new trade
  const trade = await prisma.trade.create({
    data: {
      ticker,
      direction: direction || 'long',
      entryPrice: price,
      takeProfit,
      stopLoss,
      quantity: quantity || 1.0,
      strategy,
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

  console.log(`✅ Trade opened [ID: ${trade.id}] ${ticker} ${direction?.toUpperCase()} @ ${price} | Strategy: ${strategy || 'N/A'} | SL: ${stopLoss || 'N/A'} | TP: ${takeProfit || 'N/A'} | Qty: ${trade.quantity} (saved: ${quantity || 1})`);
  return trade;
}

async function handleTakeProfit(payload: WebhookPayload) {
  const { ticker, price, pnl: payloadPnl } = payload;

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
    console.warn(`⚠️ No open trade found for ticker ${ticker} - cannot process take profit`);
    return null;
  }

  console.log(`🔍 Found open trade [ID: ${openTrade.id}] for ${ticker} - Quantity from DB: ${openTrade.quantity}, Type: ${typeof openTrade.quantity}`);

  // Use P&L from TradingView if provided, otherwise calculate it
  const pnl = payloadPnl !== undefined ? payloadPnl : calculatePnL(openTrade, price);
  const pnlPercent = ((price - openTrade.entryPrice) / openTrade.entryPrice) * 100;

  console.log(`💰 Using P&L: $${pnl.toFixed(2)} (${payloadPnl !== undefined ? 'from TradingView' : 'calculated'})`);

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

  console.log(`🎯 Take Profit HIT [ID: ${trade.id}] ${ticker} | Entry: ${openTrade.entryPrice} → Exit: ${price} | P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
  return trade;
}

async function handleStopLoss(payload: WebhookPayload) {
  const { ticker, price, pnl: payloadPnl } = payload;

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
    console.warn(`⚠️ No open trade found for ticker ${ticker} - cannot process stop loss`);
    return null;
  }

  console.log(`🔍 Found open trade [ID: ${openTrade.id}] for ${ticker} - Quantity from DB: ${openTrade.quantity}, Type: ${typeof openTrade.quantity}`);

  // Use P&L from TradingView if provided, otherwise calculate it
  const pnl = payloadPnl !== undefined ? payloadPnl : calculatePnL(openTrade, price);
  const pnlPercent = ((price - openTrade.entryPrice) / openTrade.entryPrice) * 100;

  console.log(`💰 Using P&L: $${pnl.toFixed(2)} (${payloadPnl !== undefined ? 'from TradingView' : 'calculated'})`);

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

  console.log(`🛑 Stop Loss HIT [ID: ${trade.id}] ${ticker} | Entry: ${openTrade.entryPrice} → Exit: ${price} | P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
  return trade;
}

function calculatePnL(trade: any, exitPrice: number): number {
  const entryPrice = trade.entryPrice;
  const quantity = trade.quantity || 1;
  const direction = trade.direction;

  console.log(`📊 P&L Calculation - Entry: ${entryPrice}, Exit: ${exitPrice}, Direction: ${direction}, Quantity: ${quantity}, Trade ID: ${trade.id}`);

  let pnl;
  if (direction === 'long') {
    pnl = (exitPrice - entryPrice) * quantity;
  } else {
    pnl = (entryPrice - exitPrice) * quantity;
  }

  console.log(`💰 Calculated P&L: $${pnl.toFixed(2)} (${(exitPrice - entryPrice).toFixed(2)} points × ${quantity} contracts)`);

  return pnl;
}

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
      const slMatch = content.match(/SL\d*:\s*([\d.]+)/);  // Matches SL:, SL1:, SL2:, etc.
      const tpMatch = content.match(/TP\d*:\s*([\d.]+)/);  // Matches TP:, TP1:, TP2:, etc.
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
      const slMatch = content.match(/SL\d*:\s*([\d.]+)/);  // Matches SL:, SL1:, SL2:, etc.
      const tpMatch = content.match(/TP\d*:\s*([\d.]+)/);  // Matches TP:, TP1:, TP2:, etc.
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

    // Take Profit - supports "Take Profit HIT", "TP", "TP1 HIT", "TP2 HIT", etc.
    const isTakeProfit = content.includes('Take Profit HIT') || /\bTP\d*\s*HIT\b/i.test(content) || / TP[| ]/.test(content) || content.endsWith(' TP');
    if (isTakeProfit) {
      const tickerMatch = content.match(/^(?:[^\s]+\s+)?([A-Z0-9!@#$%^&*_+\-=]+)\s+(?:BUY|SELL|LONG|SHORT)/i);
      const exitMatch = content.match(/Exit:\s*([\d,.]+)/);
      const pnlMatch = content.match(/P&L:\s*\$?(-?[\d,.]+)/);

      if (tickerMatch && exitMatch) {
        return {
          action: 'take_profit',
          ticker: tickerMatch[1],
          price: parseFloat(exitMatch[1].replace(/,/g, '')),
          pnl: pnlMatch ? parseFloat(pnlMatch[1].replace(/,/g, '')) : undefined,
          strategy,
        };
      }
    }

    // Stop Loss - supports "Stop Loss HIT", "SL", "SL1 HIT", "SL2 HIT", etc.
    const isStopLoss = content.includes('Stop Loss HIT') || /\bSL\d*\s*HIT\b/i.test(content) || / SL[| ]/.test(content) || content.endsWith(' SL');
    if (isStopLoss) {
      const tickerMatch = content.match(/^(?:[^\s]+\s+)?([A-Z0-9!@#$%^&*_+\-=]+)\s+(?:BUY|SELL|LONG|SHORT)/i);
      const exitMatch = content.match(/Exit:\s*([\d,.]+)/);
      const pnlMatch = content.match(/P&L:\s*\$?(-?[\d,.]+)/);

      if (tickerMatch && exitMatch) {
        return {
          action: 'stop_loss',
          ticker: tickerMatch[1],
          price: parseFloat(exitMatch[1].replace(/,/g, '')),
          pnl: pnlMatch ? parseFloat(pnlMatch[1].replace(/,/g, '')) : undefined,
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
    let isDuplicate = false;

    switch (payload.action) {
      case 'entry': {
        const entryResult = await handleEntry(payload);
        trade = entryResult.trade;
        isDuplicate = entryResult.isDuplicate;
        break;
      }
      case 'take_profit': {
        const tpResult = await handleTakeProfit(payload);
        trade = tpResult.trade;
        isDuplicate = tpResult.isDuplicate;
        break;
      }
      case 'stop_loss': {
        const slResult = await handleStopLoss(payload);
        trade = slResult.trade;
        isDuplicate = slResult.isDuplicate;
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${payload.action}` },
          { status: 400 }
        );
    }

    // Skip forwarding for duplicate signals
    if (isDuplicate) {
      console.log(`⏭️ Skipping forwarding for duplicate ${payload.action} signal on ${payload.ticker}`);
      return NextResponse.json({
        success: true,
        message: `Duplicate ${payload.action} signal - skipped forwarding`,
        tradeId: trade?.id,
        isDuplicate: true,
      });
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

interface EntryResult {
  trade: any;
  isDuplicate: boolean;
}

async function handleEntry(payload: WebhookPayload): Promise<EntryResult> {
  const { ticker, price, direction, takeProfit, stopLoss, quantity, strategy } = payload;

  console.log(`📥 Entry Payload - Ticker: ${ticker}, Price: ${price}, Direction: ${direction}, Quantity: ${quantity}, Strategy: ${strategy || 'N/A'}, Type: ${typeof quantity}`);

  // Create the trade first, then dedupe - this handles race conditions
  // where two signals arrive simultaneously
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

  // Now check if there are duplicate trades (same ticker + strategy, created within 60 seconds)
  // Different strategies can legitimately trigger on the same ticker at the same time
  const recentCutoff = new Date(Date.now() - 60 * 1000);
  const recentTrades = await prisma.trade.findMany({
    where: {
      ticker,
      strategy: strategy || null, // Match exact strategy (including null)
      status: 'open',
      openedAt: { gte: recentCutoff },
    },
    orderBy: { openedAt: 'asc' }, // Oldest first
  });

  // If there are multiple recent trades for same ticker+strategy, keep only the oldest
  if (recentTrades.length > 1) {
    const oldestTrade = recentTrades[0];
    const duplicateIds = recentTrades.slice(1).map(t => t.id);

    console.log(`⚠️ Race condition detected - ${recentTrades.length} trades for ${ticker}/${strategy || 'no-strategy'} in last 60s`);
    console.log(`   Keeping oldest: ID ${oldestTrade.id} (created ${oldestTrade.openedAt.toISOString()})`);
    console.log(`   Deleting duplicates: IDs ${duplicateIds.join(', ')}`);

    // Delete the duplicate trades and their events
    await prisma.tradeEvent.deleteMany({
      where: { tradeId: { in: duplicateIds } },
    });
    await prisma.trade.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    logger.warn('webhook', 'Duplicate trades cleaned up (race condition)', {
      ticker,
      strategy,
      keptTradeId: oldestTrade.id,
      deletedTradeIds: duplicateIds,
      totalDuplicates: duplicateIds.length,
    });

    // This was a duplicate - the trade we created was deleted
    if (trade.id !== oldestTrade.id) {
      return { trade: oldestTrade, isDuplicate: true };
    }
  }

  console.log(`✅ Trade opened [ID: ${trade.id}] ${ticker} ${direction?.toUpperCase()} @ ${price} | Strategy: ${strategy || 'N/A'} | SL: ${stopLoss || 'N/A'} | TP: ${takeProfit || 'N/A'} | Qty: ${trade.quantity} (saved: ${quantity || 1})`);
  return { trade, isDuplicate: false };
}

async function handleTakeProfit(payload: WebhookPayload): Promise<EntryResult> {
  const { ticker, price, pnl: payloadPnl, strategy } = payload;

  console.log(`🎯 Processing take_profit - Ticker: ${ticker}, Strategy from signal: ${strategy || 'NONE'}`);

  // FIRST: Check for recent TP events to catch race conditions
  // If there's already a take_profit event for this ticker+strategy in the last 60 seconds, it's a duplicate
  // IMPORTANT: Must match strategy exactly - use null for trades without strategy
  const recentTPEvent = await prisma.tradeEvent.findFirst({
    where: {
      eventType: 'take_profit',
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      trade: {
        ticker,
        strategy: strategy ? strategy : null, // Explicit: match exact strategy or NULL if no strategy
      },
    },
    include: { trade: true },
    orderBy: { createdAt: 'desc' },
  });

  if (recentTPEvent) {
    console.log(`⚠️ Duplicate take_profit detected - recent TP event exists for ${ticker}/${strategy || 'no-strategy'} (event ${recentTPEvent.id}, trade ${recentTPEvent.tradeId}, ${Math.round((Date.now() - recentTPEvent.createdAt.getTime()) / 1000)}s ago)`);
    return { trade: recentTPEvent.trade, isDuplicate: true };
  }

  // Count all open trades for this ticker to understand the situation
  const allOpenTrades = await prisma.trade.findMany({
    where: {
      ticker,
      status: 'open',
    },
    orderBy: {
      openedAt: 'desc',
    },
  });

  console.log(`📊 Found ${allOpenTrades.length} open trade(s) for ${ticker}:`,
    allOpenTrades.map(t => `ID:${t.id}/${t.strategy || 'no-strategy'}`).join(', '));

  let openTrade = null;

  if (strategy) {
    // Signal has a strategy - ONLY match by ticker + strategy (no fallback!)
    openTrade = allOpenTrades.find(t => t.strategy === strategy);

    if (!openTrade) {
      console.warn(`⚠️ No open trade found for ${ticker}/${strategy} - strategy mismatch! Open strategies: ${allOpenTrades.map(t => t.strategy || 'null').join(', ')}`);
      // DO NOT fall back to other strategies - this would close the wrong trade
      return { trade: null, isDuplicate: true };
    }
  } else {
    // Signal has NO strategy - only close if there's exactly ONE open trade for this ticker
    if (allOpenTrades.length === 1) {
      openTrade = allOpenTrades[0];
      console.log(`📌 Signal has no strategy, but only 1 open trade exists - using it`);
    } else if (allOpenTrades.length > 1) {
      console.warn(`⚠️ Signal has no strategy but ${allOpenTrades.length} open trades exist for ${ticker} - cannot determine which to close!`);
      return { trade: null, isDuplicate: true };
    }
  }

  if (!openTrade) {
    // Check if there's a recently closed trade (within 60 seconds) - this is a duplicate
    const recentClosed = await prisma.trade.findFirst({
      where: {
        ticker,
        strategy: strategy ? strategy : null, // Explicit: match exact strategy or NULL
        status: 'closed',
        exitReason: 'take_profit',
        closedAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { closedAt: 'desc' },
    });

    if (recentClosed) {
      console.log(`⚠️ Duplicate take_profit for ${ticker}/${strategy || 'no-strategy'} - trade ${recentClosed.id} already closed ${Math.round((Date.now() - recentClosed.closedAt!.getTime()) / 1000)}s ago`);
      return { trade: recentClosed, isDuplicate: true };
    }

    console.warn(`⚠️ No open trade found for ticker ${ticker}/${strategy || 'no-strategy'} - cannot process take profit`);
    return { trade: null, isDuplicate: true };
  }

  console.log(`✅ Matched trade [ID: ${openTrade.id}] for ${ticker}/${openTrade.strategy || 'no-strategy'} - Quantity: ${openTrade.quantity}`);

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
  return { trade, isDuplicate: false };
}

async function handleStopLoss(payload: WebhookPayload): Promise<EntryResult> {
  const { ticker, price, pnl: payloadPnl, strategy } = payload;

  console.log(`🛑 Processing stop_loss - Ticker: ${ticker}, Strategy from signal: ${strategy || 'NONE'}`);

  // FIRST: Check for recent SL events to catch race conditions
  // If there's already a stop_loss event for this ticker+strategy in the last 60 seconds, it's a duplicate
  // IMPORTANT: Must match strategy exactly - use null for trades without strategy
  const recentSLEvent = await prisma.tradeEvent.findFirst({
    where: {
      eventType: 'stop_loss',
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      trade: {
        ticker,
        strategy: strategy ? strategy : null, // Explicit: match exact strategy or NULL if no strategy
      },
    },
    include: { trade: true },
    orderBy: { createdAt: 'desc' },
  });

  if (recentSLEvent) {
    console.log(`⚠️ Duplicate stop_loss detected - recent SL event exists for ${ticker}/${strategy || 'no-strategy'} (event ${recentSLEvent.id}, trade ${recentSLEvent.tradeId}, ${Math.round((Date.now() - recentSLEvent.createdAt.getTime()) / 1000)}s ago)`);
    return { trade: recentSLEvent.trade, isDuplicate: true };
  }

  // Count all open trades for this ticker to understand the situation
  const allOpenTrades = await prisma.trade.findMany({
    where: {
      ticker,
      status: 'open',
    },
    orderBy: {
      openedAt: 'desc',
    },
  });

  console.log(`📊 Found ${allOpenTrades.length} open trade(s) for ${ticker}:`,
    allOpenTrades.map(t => `ID:${t.id}/${t.strategy || 'no-strategy'}`).join(', '));

  let openTrade = null;

  if (strategy) {
    // Signal has a strategy - ONLY match by ticker + strategy (no fallback!)
    openTrade = allOpenTrades.find(t => t.strategy === strategy);

    if (!openTrade) {
      console.warn(`⚠️ No open trade found for ${ticker}/${strategy} - strategy mismatch! Open strategies: ${allOpenTrades.map(t => t.strategy || 'null').join(', ')}`);
      // DO NOT fall back to other strategies - this would close the wrong trade
      return { trade: null, isDuplicate: true };
    }
  } else {
    // Signal has NO strategy - only close if there's exactly ONE open trade for this ticker
    if (allOpenTrades.length === 1) {
      openTrade = allOpenTrades[0];
      console.log(`📌 Signal has no strategy, but only 1 open trade exists - using it`);
    } else if (allOpenTrades.length > 1) {
      console.warn(`⚠️ Signal has no strategy but ${allOpenTrades.length} open trades exist for ${ticker} - cannot determine which to close!`);
      return { trade: null, isDuplicate: true };
    }
  }

  if (!openTrade) {
    // Check if there's a recently closed trade (within 60 seconds) - this is a duplicate
    const recentClosed = await prisma.trade.findFirst({
      where: {
        ticker,
        strategy: strategy ? strategy : null, // Explicit: match exact strategy or NULL
        status: 'closed',
        exitReason: 'stop_loss',
        closedAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { closedAt: 'desc' },
    });

    if (recentClosed) {
      console.log(`⚠️ Duplicate stop_loss for ${ticker}/${strategy || 'no-strategy'} - trade ${recentClosed.id} already closed ${Math.round((Date.now() - recentClosed.closedAt!.getTime()) / 1000)}s ago`);
      return { trade: recentClosed, isDuplicate: true };
    }

    console.warn(`⚠️ No open trade found for ticker ${ticker}/${strategy || 'no-strategy'} - cannot process stop loss`);
    return { trade: null, isDuplicate: true };
  }

  console.log(`✅ Matched trade [ID: ${openTrade.id}] for ${ticker}/${openTrade.strategy || 'no-strategy'} - Quantity: ${openTrade.quantity}`);

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
  return { trade, isDuplicate: false };
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

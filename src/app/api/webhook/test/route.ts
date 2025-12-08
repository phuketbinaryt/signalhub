import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ParsedPayload {
  action?: string;
  ticker?: string;
  price?: number;
  direction?: string;
  takeProfit?: number;
  stopLoss?: number;
  quantity?: number;
  pnl?: number;
  strategy?: string;
}

// Parse text-based webhook format (same as main webhook)
function parseTextWebhook(content: string): ParsedPayload | null {
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
    const contentType = request.headers.get('content-type') || '';
    const bodyText = await request.text();

    const result: any = {
      receivedAt: new Date().toISOString(),
      contentType,
      rawBody: bodyText,
      rawBodyLength: bodyText.length,
    };

    // Try to parse as JSON first
    let rawPayload: any;
    let isPlainText = false;

    try {
      rawPayload = JSON.parse(bodyText);
      result.isJson = true;
      result.jsonPayload = rawPayload;
    } catch (e) {
      isPlainText = true;
      result.isJson = false;
      result.isPlainText = true;
    }

    // Parse the payload
    let parsedPayload: ParsedPayload | null = null;

    if (isPlainText) {
      result.parsingMethod = 'Plain text parsing';
      parsedPayload = parseTextWebhook(bodyText);
    } else if (rawPayload.content && typeof rawPayload.content === 'string') {
      result.parsingMethod = 'JSON with content field';
      result.contentField = rawPayload.content;
      parsedPayload = parseTextWebhook(rawPayload.content);
    } else {
      result.parsingMethod = 'Direct JSON payload';
      parsedPayload = {
        action: rawPayload.action,
        ticker: rawPayload.ticker,
        price: rawPayload.price,
        direction: rawPayload.direction,
        takeProfit: rawPayload.takeProfit,
        stopLoss: rawPayload.stopLoss,
        quantity: rawPayload.quantity,
        pnl: rawPayload.pnl,
        strategy: rawPayload.strategy,
      };
    }

    result.parsedPayload = parsedPayload;
    result.parseSuccess = parsedPayload !== null;

    // Strategy extraction debug
    if (result.contentField || isPlainText) {
      const textToParse = result.contentField || bodyText;
      const strategyMatch = textToParse.match(/Strategy:\s*([^\s|]+)/);
      result.strategyDebug = {
        regexPattern: '/Strategy:\\s*([^\\s|]+)/',
        matchResult: strategyMatch,
        extractedStrategy: strategyMatch ? strategyMatch[1] : null,
        textAroundStrategy: textToParse.includes('Strategy:')
          ? textToParse.substring(
              Math.max(0, textToParse.indexOf('Strategy:') - 10),
              Math.min(textToParse.length, textToParse.indexOf('Strategy:') + 50)
            )
          : 'Strategy: not found in text',
      };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to parse webhook',
      message: error.message,
    }, { status: 500 });
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return NextResponse.json({
    message: 'Webhook Test Endpoint',
    usage: 'POST your webhook payload to this endpoint to see how it will be parsed',
    example: {
      plainText: 'Send raw text like: �rugpull CL1! BUY Signal | Entry: 68.50 | SL: 68.00 | TP: 69.50 | Contracts: 2 | Strategy: CL-5M',
      jsonWithContent: {
        content: '🚀 MNQ1! BUY Signal | Entry: 21500.00 | Strategy: MNQ-Scalp',
      },
      directJson: {
        action: 'entry',
        ticker: 'MNQ1!',
        price: 21500.00,
        direction: 'long',
        strategy: 'MNQ-Scalp',
      },
    },
  });
}

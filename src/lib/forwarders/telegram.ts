const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const FETCH_TIMEOUT = 10000; // 10 seconds

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function forwardToTelegram(payload: any): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured, skipping Telegram forward');
    return;
  }

  const message = formatTelegramMessage(payload);
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        },
        FETCH_TIMEOUT
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API failed: ${JSON.stringify(errorData)}`);
      }

      console.log('Successfully forwarded to Telegram');
      return;
    } catch (error: any) {
      lastError = error;

      // Check if it's a retryable error (network/timeout)
      const isRetryable =
        error.name === 'AbortError' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.cause?.code === 'ETIMEDOUT' ||
        error.cause?.code === 'ECONNRESET';

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.warn(`Telegram forwarder attempt ${attempt}/${MAX_RETRIES} failed (${error.code || error.name}), retrying in ${delay}ms...`);
        await sleep(delay);
      } else if (!isRetryable) {
        // Non-retryable error, fail immediately
        console.error('Telegram forwarder failed with non-retryable error:', error);
        throw error;
      }
    }
  }

  // All retries exhausted
  console.error(`Telegram forwarder failed after ${MAX_RETRIES} attempts:`, lastError);
  throw lastError;
}

function formatTelegramMessage(payload: any): string {
  const { action, ticker, price, direction, takeProfit, stopLoss, pnl, pnlPercent, entryPrice, strategy, quantity } = payload;

  const emoji = action === 'entry' ? '🟢' : action === 'take_profit' ? '🎯' : '🛑';

  // For entry signals, use BUY/SELL instead of ENTRY
  let signalType = action.toUpperCase().replace('_', ' ');
  if (action === 'entry' && direction) {
    signalType = direction.toUpperCase() === 'LONG' ? 'BUY' : 'SELL';
  }

  let message = `${emoji} *${signalType}* Signal\n\n`;
  message += `*Ticker:* ${ticker}\n`;

  if (strategy) {
    message += `*Strategy:* ${strategy}\n`;
  }

  message += `*Price:* $${price}\n`;

  if (direction) {
    message += `*Direction:* ${direction.toUpperCase()}\n`;
  }

  if (quantity) {
    message += `*Position Size:* ${quantity} contract${quantity > 1 ? 's' : ''}\n`;
  }

  // For entry signals, show TP/SL targets
  if (action === 'entry') {
    if (takeProfit) {
      message += `*Take Profit:* $${takeProfit}\n`;
    }

    if (stopLoss) {
      message += `*Stop Loss:* $${stopLoss}\n`;
    }
  }

  // For TP/SL signals, show entry price and P&L
  if (action === 'take_profit' || action === 'stop_loss') {
    if (entryPrice) {
      message += `*Entry Price:* $${entryPrice}\n`;
    }

    if (pnl !== undefined) {
      const pnlFormatted = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      const pnlEmoji = pnl >= 0 ? '💰' : '📉';
      message += `${pnlEmoji} *P&L:* ${pnlFormatted}`;

      if (pnlPercent !== undefined) {
        message += ` (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
      }
      message += '\n';
    }
  }

  message += `\n_Time:_ ${new Date().toLocaleString()}`;

  return message;
}

export async function forwardToTelegram(payload: any): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured, skipping Telegram forward');
    return;
  }

  try {
    const message = formatTelegramMessage(payload);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API failed: ${JSON.stringify(errorData)}`);
    }

    console.log('Successfully forwarded to Telegram');
  } catch (error) {
    console.error('Failed to forward to Telegram:', error);
    throw error;
  }
}

function formatTelegramMessage(payload: any): string {
  const { action, ticker, price, direction, takeProfit, stopLoss, pnl, pnlPercent, entryPrice, strategy } = payload;

  const emoji = action === 'entry' ? '🟢' : action === 'take_profit' ? '🎯' : '🛑';

  let message = `${emoji} *${action.toUpperCase().replace('_', ' ')}* Signal\n\n`;
  message += `*Ticker:* ${ticker}\n`;

  if (strategy) {
    message += `*Strategy:* ${strategy}\n`;
  }

  message += `*Price:* $${price}\n`;

  if (direction) {
    message += `*Direction:* ${direction.toUpperCase()}\n`;
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

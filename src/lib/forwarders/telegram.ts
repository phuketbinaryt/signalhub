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
  const { action, ticker, price, direction, takeProfit, stopLoss } = payload;

  const emoji = action === 'entry' ? '🟢' : action === 'take_profit' ? '🎯' : '🛑';

  let message = `${emoji} *${action.toUpperCase()}* Signal\n\n`;
  message += `*Ticker:* ${ticker}\n`;
  message += `*Price:* $${price}\n`;

  if (direction) {
    message += `*Direction:* ${direction.toUpperCase()}\n`;
  }

  if (takeProfit) {
    message += `*Take Profit:* $${takeProfit}\n`;
  }

  if (stopLoss) {
    message += `*Stop Loss:* $${stopLoss}\n`;
  }

  message += `\n_Time:_ ${new Date().toLocaleString()}`;

  return message;
}

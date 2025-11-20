export async function forwardToDiscord(payload: any): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured, skipping Discord forward');
    return;
  }

  try {
    const message = formatDiscordMessage(payload);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [message],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully forwarded to Discord');
  } catch (error) {
    console.error('Failed to forward to Discord:', error);
    throw error;
  }
}

function formatDiscordMessage(payload: any) {
  const { action, ticker, price, direction, takeProfit, stopLoss, pnl, pnlPercent, entryPrice, strategy } = payload;

  const color = action === 'entry' ? 0x00ff00 : action === 'take_profit' ? 0x0099ff : 0xff0000;
  const emoji = action === 'entry' ? '🟢' : action === 'take_profit' ? '🎯' : '🛑';

  const fields: any[] = [
    { name: 'Action', value: action.toUpperCase(), inline: true },
    { name: 'Ticker', value: ticker, inline: true },
    { name: 'Price', value: `$${price}`, inline: true },
  ];

  if (strategy) {
    fields.push({ name: 'Strategy', value: strategy, inline: true });
  }

  if (direction) {
    fields.push({ name: 'Direction', value: direction.toUpperCase(), inline: true });
  }

  // For entry signals, show TP/SL targets
  if (action === 'entry') {
    if (takeProfit) {
      fields.push({ name: 'Take Profit', value: `$${takeProfit}`, inline: true });
    }

    if (stopLoss) {
      fields.push({ name: 'Stop Loss', value: `$${stopLoss}`, inline: true });
    }
  }

  // For TP/SL signals, show entry price and P&L
  if ((action === 'take_profit' || action === 'stop_loss') && entryPrice) {
    fields.push({ name: 'Entry Price', value: `$${entryPrice}`, inline: true });

    if (pnl !== undefined && pnl !== null) {
      const pnlFormatted = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      const pnlColor = pnl >= 0 ? '🟢' : '🔴';
      fields.push({ name: 'P&L', value: `${pnlColor} ${pnlFormatted}`, inline: true });
    }

    if (pnlPercent !== undefined && pnlPercent !== null) {
      const percentFormatted = pnlPercent >= 0 ? `+${pnlPercent.toFixed(2)}%` : `${pnlPercent.toFixed(2)}%`;
      fields.push({ name: 'P&L %', value: percentFormatted, inline: true });
    }
  }

  return {
    title: `${emoji} ${action.toUpperCase()} Signal`,
    description: `New trading signal received for ${ticker}`,
    color,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'TradingView Webhook',
    },
  };
}

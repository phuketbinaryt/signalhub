import { prisma } from '../prisma';

interface PickMyTradeSettings {
  enabled: boolean;
  webhookUrls: string[];
  allowedTickers: string[];
  token: string;
  accountId: string;
}

export async function forwardToPickMyTrade(payload: any): Promise<void> {
  try {
    // Get settings from database
    const settingsRecord = await prisma.settings.findUnique({
      where: { key: 'pickmytrade' },
    });

    if (!settingsRecord) {
      console.log('PickMyTrade not configured, skipping forward');
      return;
    }

    const settings = settingsRecord.value as unknown as PickMyTradeSettings;

    // Check if enabled
    if (!settings.enabled) {
      console.log('PickMyTrade forwarding is disabled');
      return;
    }

    // Only forward entry signals
    if (payload.action !== 'entry') {
      console.log('PickMyTrade: Skipping non-entry signal');
      return;
    }

    // Check if ticker is allowed
    if (settings.allowedTickers.length > 0 && !settings.allowedTickers.includes(payload.ticker)) {
      console.log(`PickMyTrade: Ticker ${payload.ticker} not in allowed list`);
      return;
    }

    // Check if required fields are present
    if (!settings.webhookUrls || settings.webhookUrls.length === 0) {
      console.warn('PickMyTrade webhook URLs not configured');
      return;
    }

    if (!settings.token || !settings.accountId) {
      console.warn('PickMyTrade token or account ID not configured');
      return;
    }

    // Transform payload to PickMyTrade format
    const pickMyTradePayload = {
      symbol: payload.ticker,
      date: new Date().toISOString(),
      data: payload.direction === 'long' ? 'buy' : 'sell',
      quantity: payload.quantity || 1,
      risk_percentage: 0,
      price: payload.price,
      gtd_in_second: 0,
      stp_limit_stp_price: 0,
      tp: payload.takeProfit || 0,
      percentage_tp: 0,
      dollar_tp: 0,
      sl: payload.stopLoss || 0,
      percentage_sl: 0,
      dollar_sl: 0,
      trail: 0,
      trail_stop: 0,
      trail_trigger: 0,
      trail_freq: 0,
      update_tp: false,
      update_sl: false,
      breakeven: 0,
      breakeven_offset: 0,
      token: settings.token,
      pyramid: false,
      same_direction_ignore: false,
      reverse_order_close: true,
      order_type: 'MKT',
      multiple_accounts: [
        {
          token: settings.token,
          account_id: settings.accountId,
          risk_percentage: 0,
          quantity_multiplier: 1,
        },
      ],
    };

    console.log('📤 Forwarding to PickMyTrade:', {
      ticker: payload.ticker,
      direction: payload.direction,
      urls: settings.webhookUrls.length,
    });

    // Send to all configured webhook URLs
    const promises = settings.webhookUrls.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pickMyTradePayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`PickMyTrade webhook failed: ${response.status} ${errorText}`);
        }

        console.log(`✅ Successfully forwarded to PickMyTrade: ${url}`);
      } catch (error: any) {
        console.error(`❌ Failed to forward to PickMyTrade (${url}):`, error.message);
        throw error;
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error in PickMyTrade forwarder:', error);
    throw error;
  }
}

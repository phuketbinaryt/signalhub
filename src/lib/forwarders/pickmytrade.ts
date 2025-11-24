import { prisma } from '../prisma';

export async function forwardToPickMyTrade(payload: any): Promise<void> {
  try {
    // Only forward entry signals
    if (payload.action !== 'entry') {
      console.log('PickMyTrade: Skipping non-entry signal');
      return;
    }

    // Get all enabled configs from database
    const configs = await prisma.pickMyTradeConfig.findMany({
      where: { enabled: true },
    });

    if (configs.length === 0) {
      console.log('PickMyTrade: No enabled configurations found');
      return;
    }

    console.log(`📤 Found ${configs.length} enabled PickMyTrade config(s)`);

    // Process each config
    const configPromises = configs.map(async (config) => {
      try {
        const webhookUrls = config.webhookUrls as string[];
        const allowedTickers = config.allowedTickers as string[];

        // Check if ticker is allowed for this config
        if (allowedTickers.length > 0 && !allowedTickers.includes(payload.ticker)) {
          console.log(`PickMyTrade [${config.name}]: Ticker ${payload.ticker} not in allowed list`);
          return;
        }

        // Validate required fields
        if (!webhookUrls || webhookUrls.length === 0) {
          console.warn(`PickMyTrade [${config.name}]: No webhook URLs configured`);
          return;
        }

        if (!config.token || !config.accountId) {
          console.warn(`PickMyTrade [${config.name}]: Token or account ID not configured`);
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
          token: config.token,
          pyramid: false,
          same_direction_ignore: false,
          reverse_order_close: true,
          order_type: 'MKT',
          multiple_accounts: [
            {
              token: config.token,
              account_id: config.accountId,
              risk_percentage: 0,
              quantity_multiplier: 1,
            },
          ],
        };

        console.log(`📤 Forwarding to PickMyTrade [${config.name}]:`, {
          ticker: payload.ticker,
          direction: payload.direction,
          urls: webhookUrls.length,
        });

        // Send to all webhook URLs for this config
        const urlPromises = webhookUrls.map(async (url) => {
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

            console.log(`✅ Successfully forwarded to PickMyTrade [${config.name}]: ${url}`);
          } catch (error: any) {
            console.error(`❌ Failed to forward to PickMyTrade [${config.name}] (${url}):`, error.message);
            throw error;
          }
        });

        await Promise.all(urlPromises);
      } catch (error: any) {
        console.error(`Error processing PickMyTrade config [${config.name}]:`, error.message);
        throw error;
      }
    });

    await Promise.allSettled(configPromises);
  } catch (error) {
    console.error('Error in PickMyTrade forwarder:', error);
    throw error;
  }
}

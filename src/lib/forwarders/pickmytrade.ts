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
        const strategyFilters = config.strategyFilters as Record<string, string[]>;
        const contractMapping = config.contractMapping as Record<string, string> || {};

        // Check if ticker/strategy combination is allowed
        const tickers = Object.keys(strategyFilters);

        // If no filters set, allow all
        if (tickers.length === 0) {
          console.log(`PickMyTrade [${config.name}]: No filters set, allowing all`);
        } else {
          // Check if ticker is in filters
          if (!strategyFilters[payload.ticker]) {
            console.log(`PickMyTrade [${config.name}]: Ticker ${payload.ticker} not in filter list`);
            return;
          }

          // Check if strategy filtering is required for this ticker
          const allowedStrategies = strategyFilters[payload.ticker];

          // If strategies array is not empty, check if payload strategy matches
          if (allowedStrategies.length > 0) {
            const payloadStrategy = payload.strategy || '';
            if (!allowedStrategies.includes(payloadStrategy)) {
              console.log(`PickMyTrade [${config.name}]: Strategy "${payloadStrategy}" not allowed for ticker ${payload.ticker}`);
              return;
            }
            console.log(`PickMyTrade [${config.name}]: Ticker ${payload.ticker} with strategy "${payloadStrategy}" allowed`);
          } else {
            console.log(`PickMyTrade [${config.name}]: Ticker ${payload.ticker} allowed (all strategies)`);
          }
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

        // Calculate adjusted quantity based on risk percentage
        const originalQuantity = payload.quantity || 1;
        const riskPercentage = config.riskPercentage || 100;
        const adjustedQuantity = originalQuantity * (riskPercentage / 100);

        // Apply rounding mode
        let finalQuantity: number;
        if (config.roundingMode === 'up') {
          finalQuantity = Math.ceil(adjustedQuantity);
        } else {
          // Default to rounding down
          finalQuantity = Math.floor(adjustedQuantity);
        }

        // Ensure at least 1 contract
        finalQuantity = Math.max(1, finalQuantity);

        console.log(`PickMyTrade [${config.name}]: Quantity adjusted from ${originalQuantity} to ${finalQuantity} (${riskPercentage}% risk, ${config.roundingMode} rounding)`);

        // Check if there's a custom contract mapping for this ticker
        const symbolToUse = contractMapping[payload.ticker] || payload.ticker;
        if (contractMapping[payload.ticker]) {
          console.log(`PickMyTrade [${config.name}]: Using custom contract ${symbolToUse} instead of ${payload.ticker}`);
        }

        // Transform payload to PickMyTrade format
        const pickMyTradePayload = {
          symbol: symbolToUse,
          date: new Date().toISOString(),
          data: payload.direction === 'long' ? 'buy' : 'sell',
          quantity: finalQuantity,
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

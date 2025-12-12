export async function forwardToExternalDashboard(payload: any): Promise<void> {
  const externalUrl = process.env.EXTERNAL_DASHBOARD_URL;
  const externalSecret = process.env.EXTERNAL_DASHBOARD_SECRET;

  if (!externalUrl) {
    console.warn('External dashboard URL not configured, skipping external forward');
    return;
  }

  if (!externalSecret) {
    console.warn('External dashboard secret not configured, skipping external forward');
    return;
  }

  try {
    // Map internal action to format expected by mrtrader.io
    let action: string;
    if (payload.action === 'entry') {
      action = payload.direction === 'short' ? 'sell' : 'buy';
    } else if (payload.action === 'take_profit') {
      action = 'take_profit';
    } else if (payload.action === 'stop_loss') {
      action = 'stop_loss';
    } else {
      action = payload.action; // fallback
    }

    // Transform payload to mrtrader.io format
    const externalPayload = {
      symbol: payload.ticker,
      action: action,
      price: payload.price,
      stopLoss: payload.stopLoss ?? null,
      takeProfit: payload.takeProfit ?? null,
      positionSize: payload.quantity || 1,
      strategy: payload.strategy ?? null,
    };

    // Build URL with secret as query parameter
    const urlWithSecret = `${externalUrl}${externalUrl.includes('?') ? '&' : '?'}secret=${externalSecret}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(urlWithSecret, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`External dashboard webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Successfully forwarded to external dashboard:', externalPayload);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('⏱️ External dashboard request timed out after 5 seconds');
    } else {
      console.error('❌ Failed to forward to external dashboard:', error.message);
    }
    throw error;
  }
}

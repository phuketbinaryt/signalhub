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
    // Transform payload to external dashboard format
    const externalPayload = {
      secret: externalSecret,
      symbol: payload.ticker,
      action: payload.action,
      price: payload.price,
      timestamp: Date.now(),
      stopLoss: payload.stopLoss || null,
      takeProfit: payload.takeProfit || null,
      positionSize: payload.quantity || 1,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(externalUrl, {
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

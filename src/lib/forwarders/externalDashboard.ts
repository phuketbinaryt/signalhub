export async function forwardToExternalDashboard(payload: any): Promise<void> {
  const externalUrl = process.env.EXTERNAL_DASHBOARD_URL;

  if (!externalUrl) {
    console.warn('External dashboard URL not configured, skipping external forward');
    return;
  }

  try {
    // Transform payload to external dashboard format
    const externalPayload = {
      symbol: payload.ticker,
      action: payload.action,
      price: payload.price,
      timestamp: Date.now(),
      stopLoss: payload.stopLoss || null,
      takeProfit: payload.takeProfit || null,
      positionSize: payload.quantity || 1,
    };

    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalPayload),
    });

    if (!response.ok) {
      throw new Error(`External dashboard webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Successfully forwarded to external dashboard:', externalPayload);
  } catch (error) {
    console.error('Failed to forward to external dashboard:', error);
    throw error;
  }
}

import { forwardToDiscord } from './discord';
import { forwardToTelegram } from './telegram';
import { forwardToExternalDashboard } from './externalDashboard';
import { forwardToPickMyTrade } from './pickmytrade';

export async function dispatchForwarders(payload: any): Promise<void> {
  const forwarders: Promise<void>[] = [];
  const forwarderNames: string[] = [];

  // Determine which forwarders to use based on action and order type
  // Selective forwarding rules:
  // - LMT entries → PickMyTrade ONLY
  // - CANCEL → PickMyTrade ONLY
  // - ORDER FILLED → dashboard/telegram/discord/external ONLY (NOT PickMyTrade)
  // - MKT entries → all destinations
  // - TP/SL → dashboard/telegram/discord/external (PickMyTrade skips these internally)

  const action = payload.action;
  const orderType = payload.orderType?.toUpperCase() || 'MKT';
  const isLimitEntry = action === 'entry' && orderType === 'LMT';
  const isCancel = action === 'cancel';
  const isOrderFilled = action === 'order_filled';

  // PickMyTrade: gets entries (MKT and LMT) and cancel signals
  // (PickMyTrade internally skips TP/SL/order_filled)
  forwarders.push(forwardToPickMyTrade(payload));
  forwarderNames.push('PickMyTrade');

  // Dashboard/Telegram/Discord/External: skip LMT entries and cancel signals
  // They only get: MKT entries, order_filled, TP, SL
  if (!isLimitEntry && !isCancel) {
    forwarders.push(forwardToDiscord(payload));
    forwarderNames.push('Discord');

    forwarders.push(forwardToTelegram(payload));
    forwarderNames.push('Telegram');

    forwarders.push(forwardToExternalDashboard(payload));
    forwarderNames.push('External Dashboard');
  } else {
    console.log(`📤 Skipping Discord/Telegram/External for ${action} (orderType: ${orderType}) - PickMyTrade only`);
  }

  // Run all forwarders in parallel and collect results
  const results = await Promise.allSettled(forwarders);

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`${forwarderNames[index]} forwarder failed:`, result.reason);
    }
  });

  // Continue even if some forwarders fail
  console.log('Webhook forwarding completed');
}

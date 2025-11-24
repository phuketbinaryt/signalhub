import { forwardToDiscord } from './discord';
import { forwardToTelegram } from './telegram';
import { forwardToExternalDashboard } from './externalDashboard';
import { forwardToPickMyTrade } from './pickmytrade';

export async function dispatchForwarders(payload: any): Promise<void> {
  const forwarders = [
    forwardToDiscord(payload),
    forwardToTelegram(payload),
    forwardToExternalDashboard(payload),
    forwardToPickMyTrade(payload),
  ];

  // Run all forwarders in parallel and collect results
  const results = await Promise.allSettled(forwarders);

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const forwarderNames = ['Discord', 'Telegram', 'External Dashboard', 'PickMyTrade'];
      console.error(`${forwarderNames[index]} forwarder failed:`, result.reason);
    }
  });

  // Continue even if some forwarders fail
  console.log('Webhook forwarding completed');
}

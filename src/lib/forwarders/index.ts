import { forwardToDiscord } from './discord';
import { forwardToTelegram } from './telegram';
import { forwardToExternalDashboard } from './externalDashboard';

export async function dispatchForwarders(payload: any): Promise<void> {
  const forwarders = [
    forwardToDiscord(payload),
    forwardToTelegram(payload),
    forwardToExternalDashboard(payload),
  ];

  // Run all forwarders in parallel and collect results
  const results = await Promise.allSettled(forwarders);

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const forwarderNames = ['Discord', 'Telegram', 'External Dashboard'];
      console.error(`${forwarderNames[index]} forwarder failed:`, result.reason);
    }
  });

  // Continue even if some forwarders fail
  console.log('Webhook forwarding completed');
}

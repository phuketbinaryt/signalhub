import webpush from 'web-push';
import { prisma } from './prisma';

// Configure web-push with VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
let vapidEmail = process.env.VAPID_EMAIL || 'mailto:noreply@example.com';

// Ensure vapidEmail has mailto: prefix
if (vapidEmail && !vapidEmail.startsWith('mailto:')) {
  vapidEmail = `mailto:${vapidEmail}`;
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export async function sendPushNotification(payload: PushNotificationPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ VAPID keys not configured, skipping push notifications');
    return;
  }

  try {
    // Get all active subscriptions
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      console.log('📱 No push subscriptions found');
      return;
    }

    console.log(`📱 Sending push to ${subscriptions.length} subscriber(s)`);

    // Send to all subscriptions
    const promises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );

        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsed: new Date() },
        });

        console.log(`✅ Push sent to subscription ${sub.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to send to subscription ${sub.id}:`, error.message);

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
          console.log(`🗑️ Removed invalid subscription ${sub.id}`);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

// Helper to format trade notifications
export function formatTradeNotification(payload: any): PushNotificationPayload {
  const { action, ticker, price, pnl, direction } = payload;

  let title = '';
  let body = '';
  let tag = `trade-${action}`;

  switch (action) {
    case 'entry':
      const directionLabel = direction === 'long' ? 'BUY' : 'SELL';
      title = `🟢 ${directionLabel} ${ticker}`;
      body = `Entry @ $${price.toFixed(2)}`;
      break;

    case 'take_profit':
      title = `🎯 Take Profit - ${ticker}`;
      body = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} profit`;
      break;

    case 'stop_loss':
      title = `🛑 Stop Loss - ${ticker}`;
      body = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} loss`;
      break;

    default:
      title = `Signal - ${ticker}`;
      body = `${action} @ $${price.toFixed(2)}`;
  }

  return {
    title,
    body,
    icon: '/logo/logo.png',
    badge: '/logo/logo.png',
    tag,
    data: { action, ticker, price, pnl },
  };
}

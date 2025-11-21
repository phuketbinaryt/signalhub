// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const { title, body, icon, badge, tag, data: notificationData } = data;

  const options = {
    body,
    icon: icon || '/logo/logo.png',
    badge: badge || '/logo/logo.png',
    tag: tag || 'trade-notification',
    data: notificationData,
    vibrate: getVibrationPattern(notificationData?.action),
    requireInteraction: notificationData?.action === 'take_profit' || notificationData?.action === 'stop_loss',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If dashboard is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});

// Custom vibration patterns per signal type
function getVibrationPattern(action) {
  switch (action) {
    case 'entry':
      return [100, 50, 100];
    case 'take_profit':
      return [200, 100, 200, 100, 200];
    case 'stop_loss':
      return [400];
    default:
      return [100];
  }
}

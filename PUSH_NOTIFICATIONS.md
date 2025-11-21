# Push Notifications Setup

This guide explains how to set up push notifications for your Trading Dashboard.

## 📱 Features

- **iPhone Support**: Works on iOS 16.4+ when installed as PWA
- **Real-time Alerts**: Get instant notifications for all trading signals
- **Custom Notifications**: Different messages for Entry, Take Profit, and Stop Loss
- **Vibration Patterns**: Unique vibration for each signal type
- **Offline Support**: Works even when browser is closed (as PWA)

## 🔧 Setup Instructions

### 1. Generate VAPID Keys

VAPID keys are required for web push notifications. Generate them once:

```bash
node scripts/generate-vapid-keys.js
```

This will output three environment variables.

### 2. Add Environment Variables

Add these to your `.env.local` file (for local development):

```env
# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key-here"
VAPID_PRIVATE_KEY="your-private-key-here"
VAPID_EMAIL="mailto:your-email@example.com"
```

⚠️ **Important**: The `NEXT_PUBLIC_` prefix is required for the public key so it's accessible in the browser.

### 3. Add to Render Environment Variables

In your Render dashboard:
1. Go to your service → Environment
2. Add the same three variables
3. Deploy the changes

### 4. Update Database Schema

Run the database migration to add the push subscriptions table:

```bash
npx prisma db push
```

Or on Render, it will run automatically on next deployment.

## 📲 User Experience

### For Desktop Users:
1. Visit the dashboard
2. See "Install App" prompt (bottom right)
3. Click "Install Now"
4. Click "Enable Notifications" button in header
5. Grant notification permission

### For iPhone Users:
1. Open dashboard in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Open the installed app
5. Tap "Enable Notifications" button
6. Grant notification permission

## 🔔 Notification Format

### Entry Signal
```
🟢 BUY MNQ
Entry @ $25,112.50
```

### Take Profit
```
🎯 Take Profit - MNQ
+$625.00 profit
```

### Stop Loss
```
🛑 Stop Loss - MNQ
-$312.50 loss
```

## 🔐 Security

- Public key is safe to expose (hence `NEXT_PUBLIC_`)
- Private key must remain secret
- Subscriptions are stored encrypted in database
- Each device gets unique subscription

## 🐛 Troubleshooting

### Notifications not working?

1. **Check browser support**: Chrome, Edge, Firefox, Safari 16.4+
2. **Check permissions**: Settings → Notifications → Allow
3. **Check VAPID keys**: Ensure they're set correctly
4. **Check console**: Look for error messages
5. **iPhone**: Must be installed as PWA (added to home screen)

### Button says "Notifications Blocked"?

User has denied permission. They need to:
1. iPhone: Settings → Safari → [Your Site] → Reset
2. Desktop: Click padlock icon → Permissions → Reset

### Not receiving notifications on iPhone?

1. Ensure iOS 16.4 or later
2. Must be installed from "Add to Home Screen"
3. Won't work in regular Safari browser
4. Check Focus mode isn't blocking

## 📊 Monitoring

Check Render logs for push notification activity:
- `✅ Push subscription saved` - New device subscribed
- `📱 Sending push to X subscriber(s)` - Notification sent
- `✅ Push sent to subscription X` - Successful delivery
- `🗑️ Removed invalid subscription` - Cleaned up expired subscription

## 🚀 Advanced

### Custom Notification Sounds

Edit `/public/sw.js` to customize vibration patterns:

```javascript
function getVibrationPattern(action) {
  switch (action) {
    case 'entry': return [100, 50, 100];
    case 'take_profit': return [200, 100, 200, 100, 200];
    case 'stop_loss': return [400];
  }
}
```

### Notification Icons

Icons are automatically pulled from `/logo/logo.png`. Update your logo to change notification icons.

## 💡 Tips

- Test with a webhook to ensure everything works
- Subscribe multiple devices for redundancy
- Notifications work globally, not just US
- No cost for push notifications (unlike SMS)

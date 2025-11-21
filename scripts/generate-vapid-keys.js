// Script to generate VAPID keys for Web Push notifications
const webpush = require('web-push');

console.log('\n🔑 Generating VAPID keys for Web Push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Add these to your .env.local file:\n');
console.log('# Web Push Notifications (VAPID keys)');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log(`VAPID_EMAIL="mailto:your-email@example.com"\n`);

console.log('✅ Keys generated successfully!\n');
console.log('⚠️  IMPORTANT:');
console.log('- Keep the VAPID_PRIVATE_KEY secret');
console.log('- Add these to your Render environment variables');
console.log('- Replace the email with your actual contact email\n');

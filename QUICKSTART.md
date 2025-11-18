# Quick Start Guide

Get your TradingView Webhook Dashboard running in 15 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)
- Google Cloud account for OAuth

## Step 1: Clone and Install (2 minutes)

```bash
git clone <your-repo-url>
cd tradingview-webhook-dashboard
npm install
```

## Step 2: Set Up Environment Variables (3 minutes)

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required - Get from your PostgreSQL instance
DATABASE_URL=postgresql://user:password@localhost:5432/tradingview

# Required - Generate these
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
WEBHOOK_SECRET=<any-secret-string>

# Required - From Google Cloud Console (see below)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional - Set up later
DISCORD_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EXTERNAL_DASHBOARD_URL=
```

## Step 3: Google OAuth Setup (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Google+ API"
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Configure:
   - Type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

## Step 4: Initialize Database (1 minute)

```bash
npm run db:push
```

## Step 5: Start Development Server (1 minute)

```bash
npm run dev
```

Visit: http://localhost:3000

## Step 6: Test the Webhook (2 minutes)

Open a new terminal and test:

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-webhook-secret",
    "action": "entry",
    "ticker": "AAPL",
    "price": 150.25,
    "direction": "long",
    "takeProfit": 155.00,
    "stopLoss": 148.00,
    "quantity": 1
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "entry processed successfully",
  "tradeId": 1
}
```

## Step 7: View Dashboard (1 minute)

1. Go to http://localhost:3000
2. Click "Sign in with Google"
3. View your dashboard with the test trade

## Next Steps

### Deploy to Render.com
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Configure TradingView Alerts
See [TRADINGVIEW_SETUP.md](TRADINGVIEW_SETUP.md) for alert setup.

### Set Up Forwarders

**Discord:**
1. Create webhook in Discord server settings
2. Add URL to `.env` as `DISCORD_WEBHOOK_URL`
3. Restart server

**Telegram:**
1. Create bot with @BotFather
2. Get chat ID from bot messages
3. Add to `.env` as `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
4. Restart server

**Test forwarders:**
```bash
# Send another test webhook - it will forward to configured services
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-webhook-secret",
    "action": "entry",
    "ticker": "TEST",
    "price": 100.00,
    "direction": "long"
  }'
```

## Troubleshooting

### Database connection error
```bash
# Check PostgreSQL is running
psql -U your-user -d tradingview

# Or create a new database
createdb tradingview
```

### Google Auth not working
- Verify redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Check Client ID and Secret are correct
- Try in incognito mode

### Port already in use
```bash
# Use a different port
PORT=3001 npm run dev
```

### Webhook returns 401
- Check `WEBHOOK_SECRET` matches in webhook payload and `.env`
- Ensure secret is not empty

## Useful Commands

```bash
# View database in browser
npm run db:studio

# Check for type errors
npm run build

# View logs in development
# Logs appear in the terminal where you ran `npm run dev`

# Reset database (WARNING: deletes all data)
npm run db:push -- --force-reset
```

## Project Structure Overview

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/        ← TradingView sends data here
│   │   ├── trades/         ← Dashboard fetches from here
│   │   └── auth/           ← Google OAuth
│   ├── dashboard/          ← Main dashboard page
│   └── page.tsx            ← Landing page
├── components/             ← React components
└── lib/
    ├── forwarders/         ← Discord, Telegram, etc.
    ├── prisma.ts           ← Database client
    └── auth.ts             ← Auth config
```

## Health Check

Visit http://localhost:3000/api/health to check system status.

## Getting Help

- Read the full [README.md](README.md)
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for Render setup
- See [TRADINGVIEW_SETUP.md](TRADINGVIEW_SETUP.md) for alerts
- Open a GitHub issue for bugs

---

**That's it!** You now have a working TradingView webhook dashboard. Happy trading!

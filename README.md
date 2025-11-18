# TradingView Webhook Dashboard

A complete, production-ready Next.js application that receives TradingView webhooks, stores them in PostgreSQL, forwards to multiple destinations (Discord, Telegram, external APIs), and provides an authenticated dashboard to view trading performance.

## Features

- **Webhook Receiver**: Secure endpoint to receive TradingView alerts
- **Multi-Destination Forwarding**: Automatically forward webhooks to Discord, Telegram, and custom endpoints
- **Trading Dashboard**: View P&L stats, win rate, and trade history grouped by ticker
- **Google Authentication**: Secure access with Google OAuth
- **PostgreSQL Storage**: All trades and events stored reliably
- **Render.com Ready**: Deploy as a single web service

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- NextAuth.js
- Tailwind CSS

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth endpoints
│   │   │   ├── webhook/       # TradingView webhook receiver
│   │   │   └── trades/        # Trades API
│   │   ├── dashboard/         # Protected dashboard page
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   └── lib/
│       ├── prisma.ts          # Prisma client
│       ├── auth.ts            # Auth configuration
│       └── forwarders/        # Webhook forwarders
├── package.json
├── next.config.mjs
├── tsconfig.json
└── tailwind.config.mjs
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Google Cloud Console account (for OAuth)
- (Optional) Discord server with webhook
- (Optional) Telegram bot

### Local Development

1. **Clone and install dependencies:**

```bash
git clone <your-repo-url>
cd tradingview-webhook-dashboard
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for local dev)
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `WEBHOOK_SECRET`: Shared secret for TradingView webhooks

Optional variables (leave empty to disable):
- `DISCORD_WEBHOOK_URL`
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- `EXTERNAL_DASHBOARD_URL`

3. **Set up Google OAuth:**

   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth Client ID
   - Application type: Web application
   - Authorized redirect URIs: Add `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret to your `.env` file

4. **Set up the database:**

```bash
npm run db:push
```

5. **Run the development server:**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment on Render.com

### Step 1: Create PostgreSQL Database

1. Log in to [Render](https://render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - Name: `tradingview-db`
   - Database: `tradingview`
   - User: (auto-generated)
   - Region: Choose closest to you
   - Plan: Select your plan
4. Click "Create Database"
5. Copy the "Internal Database URL" (starts with `postgresql://`)

### Step 2: Deploy Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `tradingview-webhook-dashboard`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Select your plan

4. **Add Environment Variables:**

   Click "Advanced" → "Add Environment Variable" and add:

   ```
   DATABASE_URL=<paste-internal-database-url-from-step-1>
   NEXTAUTH_URL=https://your-app-name.onrender.com
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   WEBHOOK_SECRET=<your-chosen-secret>
   DISCORD_WEBHOOK_URL=<optional>
   TELEGRAM_BOT_TOKEN=<optional>
   TELEGRAM_CHAT_ID=<optional>
   EXTERNAL_DASHBOARD_URL=<optional>
   ```

5. Click "Create Web Service"

### Step 3: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your OAuth Client ID
3. Add authorized redirect URI:
   ```
   https://your-app-name.onrender.com/api/auth/callback/google
   ```
4. Save changes

### Step 4: Configure TradingView

Your webhook endpoint will be:
```
https://your-app-name.onrender.com/api/webhook
```

## TradingView Webhook Configuration

### Webhook URL
```
POST https://your-domain.com/api/webhook
```

### Payload Format

**Entry Signal:**
```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "AAPL",
  "price": 150.25,
  "direction": "long",
  "takeProfit": 155.00,
  "stopLoss": 148.00,
  "quantity": 10
}
```

**Take Profit:**
```json
{
  "secret": "your-webhook-secret",
  "action": "take_profit",
  "ticker": "AAPL",
  "price": 155.00
}
```

**Stop Loss:**
```json
{
  "secret": "your-webhook-secret",
  "action": "stop_loss",
  "ticker": "AAPL",
  "price": 148.00
}
```

### Required Fields
- `secret`: Must match your `WEBHOOK_SECRET` environment variable
- `action`: One of `"entry"`, `"take_profit"`, `"stop_loss"`
- `ticker`: Stock/crypto symbol
- `price`: Current price

### Optional Fields (for entry)
- `direction`: `"long"` or `"short"` (defaults to "long")
- `takeProfit`: Target exit price
- `stopLoss`: Stop loss price
- `quantity`: Position size (defaults to 1)

## Setting Up Forwarders

### Discord

1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Copy webhook URL
5. Add to `.env` as `DISCORD_WEBHOOK_URL`

### Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Send `/start` to your bot
3. Get your chat ID: Send a message to your bot, then visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to `.env`

### External Dashboard

Simply add the webhook URL to `EXTERNAL_DASHBOARD_URL` in your `.env` file. The entire webhook payload will be forwarded as JSON.

## Database Management

### View database in browser:
```bash
npm run db:studio
```

### Create a migration:
```bash
npm run db:migrate
```

### Push schema changes:
```bash
npm run db:push
```

## API Endpoints

### POST `/api/webhook`
Receives TradingView webhooks. Requires `WEBHOOK_SECRET` in payload.

### GET `/api/trades`
Fetches trades with statistics. Requires authentication.

Query parameters:
- `ticker`: Filter by ticker symbol
- `status`: Filter by status (`open` or `closed`)
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

## Security Notes

1. Always use HTTPS in production
2. Keep your `WEBHOOK_SECRET` and `NEXTAUTH_SECRET` secure
3. Don't commit `.env` file to Git
4. Regularly rotate secrets
5. Use strong, randomly generated secrets

## Troubleshooting

### Webhooks not being received
- Check Render logs for errors
- Verify `WEBHOOK_SECRET` matches in TradingView and your `.env`
- Ensure your Render service is deployed and running

### Authentication not working
- Verify Google OAuth credentials and redirect URIs
- Check `NEXTAUTH_URL` is set correctly
- Generate a new `NEXTAUTH_SECRET` if needed

### Database connection issues
- Ensure `DATABASE_URL` is correct
- Check database is running on Render
- Run `npm run db:push` to sync schema

### Forwarders not working
- Check environment variables are set
- View Render logs for forwarding errors
- Forwarders fail gracefully - webhook will still be saved

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push Prisma schema to database
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

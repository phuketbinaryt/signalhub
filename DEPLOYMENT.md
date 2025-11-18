# Deployment Guide for Render.com

This guide walks you through deploying the TradingView Webhook Dashboard on Render.com.

## Prerequisites

- GitHub account
- Render.com account (free)
- Google Cloud Console account for OAuth

## Option 1: One-Click Deploy with Blueprint

1. Push your code to GitHub

2. In Render Dashboard:
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository with `render.yaml`
   - Click "Apply"

3. Render will automatically:
   - Create a PostgreSQL database
   - Create the web service
   - Link them together

4. **Set Environment Variables:**

   After blueprint deployment, go to your web service and set these required variables:

   ```
   NEXTAUTH_URL=https://your-app-name.onrender.com
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   WEBHOOK_SECRET=your-webhook-secret
   ```

   Optional variables:
   ```
   DISCORD_WEBHOOK_URL=your-discord-webhook
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_CHAT_ID=your-chat-id
   EXTERNAL_DASHBOARD_URL=your-external-url
   ```

5. **Configure Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Add authorized redirect URI: `https://your-app-name.onrender.com/api/auth/callback/google`

6. **Trigger Redeploy:**
   - In Render dashboard, click "Manual Deploy" → "Deploy latest commit"

## Option 2: Manual Setup

### Step 1: Create PostgreSQL Database

1. Log in to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `tradingview-db`
   - **Database**: `tradingview`
   - **Region**: Choose closest region
   - **Plan**: Free (or Basic for production)
4. Click "Create Database"
5. **Copy the Internal Database URL** (you'll need this)

### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the repository

4. **Configure Build Settings:**
   - **Name**: `tradingview-webhook-dashboard` (or your choice)
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. **Select Plan:**
   - Free (with limitations) or paid tiers for production use

6. **Environment Variables:**

   Click "Advanced" → "Add Environment Variable"

   **Required Variables:**
   ```
   DATABASE_URL=<paste-internal-database-url-from-step-1>
   NODE_ENV=production
   NEXTAUTH_URL=https://your-app-name.onrender.com
   NEXTAUTH_SECRET=<generate-random-string>
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   WEBHOOK_SECRET=<your-webhook-secret>
   ```

   **Optional Variables:**
   ```
   DISCORD_WEBHOOK_URL=
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_CHAT_ID=
   EXTERNAL_DASHBOARD_URL=
   ```

7. Click "Create Web Service"

### Step 3: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth Client ID"
5. Configure:
   - **Application type**: Web application
   - **Name**: TradingView Dashboard
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/callback/google
     https://your-app-name.onrender.com/api/auth/callback/google
     ```
6. Copy Client ID and Client Secret
7. Update environment variables in Render

### Step 4: Generate Secrets

Generate secure random strings for secrets:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# WEBHOOK_SECRET (any secure string)
openssl rand -base64 32
```

### Step 5: Test Deployment

1. Wait for deployment to complete (check logs)
2. Visit your app URL: `https://your-app-name.onrender.com`
3. Try signing in with Google
4. Check dashboard loads correctly

### Step 6: Test Webhook

Use curl to test the webhook endpoint:

```bash
curl -X POST https://your-app-name.onrender.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-webhook-secret",
    "action": "entry",
    "ticker": "TEST",
    "price": 100.00,
    "direction": "long",
    "takeProfit": 105.00,
    "stopLoss": 95.00
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

## Monitoring and Logs

### View Logs
1. Go to your web service in Render
2. Click "Logs" tab
3. Monitor for errors or webhook activity

### Database Management
1. Go to your database in Render
2. Click "Connect" to get connection details
3. Use a PostgreSQL client (e.g., TablePlus, pgAdmin) to view data

Or use Prisma Studio locally:
```bash
# Set DATABASE_URL in your local .env
npm run db:studio
```

## Updating the App

### Push Updates
1. Commit and push changes to GitHub
2. Render auto-deploys from the connected branch
3. Or manually trigger: "Manual Deploy" → "Deploy latest commit"

### Database Migrations
If you modify the Prisma schema:

1. Update `prisma/schema.prisma`
2. Commit and push
3. The build command includes `prisma generate`
4. Database schema updates automatically via `prisma db push` on deploy

Or run migrations manually:
```bash
# In Render shell (available in Starter plan and above)
npm run db:migrate
```

## Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Ensure database is running
- Check region compatibility

### Authentication Not Working
- Verify NEXTAUTH_URL matches your domain
- Check Google OAuth redirect URIs
- Ensure NEXTAUTH_SECRET is set
- Clear browser cookies and try again

### Webhooks Not Processing
- Check WEBHOOK_SECRET matches
- View logs for incoming requests
- Verify JSON payload format
- Test with curl first

### Forwarders Failing
- Check Discord/Telegram credentials
- Verify URLs are correct
- Forwarders fail gracefully - check logs for details

## Performance Tips

1. **Free Tier Limitations:**
   - Services spin down after 15 minutes of inactivity
   - First request after spin-down is slow (cold start)
   - Consider paid plans for always-on service

2. **Database Performance:**
   - Free tier has connection limits
   - Consider upgrading for production use
   - Add database indexes if queries are slow

3. **Monitoring:**
   - Set up monitoring in Render Dashboard
   - Configure alerts for errors
   - Monitor response times

## Security Checklist

- [ ] All secrets are randomly generated
- [ ] WEBHOOK_SECRET is strong and shared only with TradingView
- [ ] Google OAuth redirect URIs are set correctly
- [ ] Environment variables are not committed to Git
- [ ] HTTPS is enforced (automatic on Render)
- [ ] Database uses internal connection (more secure)

## Cost Estimation

**Free Tier:**
- Web Service: Free (with limitations - spins down after inactivity)
- PostgreSQL: Free (limited, expires after 90 days)
- Total: $0/month (temporary)

**Paid Tier (Recommended for Production):**
- Web Service: Starting at $7/month (always-on)
- PostgreSQL: Starting at $7/month (Basic plan)
- Total: ~$14/month and up

## Next Steps

After successful deployment:

1. Configure TradingView alerts with your webhook URL
2. Set up Discord/Telegram if desired
3. Test with real trading signals
4. Monitor performance and logs
5. Customize dashboard as needed

## Support

For deployment issues:
- Render Docs: https://render.com/docs
- Render Community: https://community.render.com

For app issues:
- Check GitHub repository README
- Open a GitHub issue

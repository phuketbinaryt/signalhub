# TradingView Alert Setup Guide

This guide shows you how to configure TradingView alerts to send webhooks to your dashboard.

## Prerequisites

- Deployed instance of this app (see DEPLOYMENT.md)
- TradingView account with alert capabilities
- Your `WEBHOOK_SECRET` from environment variables

## Webhook URL

Your webhook endpoint is:
```
https://your-app-name.onrender.com/api/webhook
```

Replace `your-app-name` with your actual Render app name.

## Alert Message Format

TradingView alerts must send JSON in the following format:

### Entry Signal Alert

When opening a new position:

```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "direction": "long",
  "takeProfit": {{close}} * 1.05,
  "stopLoss": {{close}} * 0.97,
  "quantity": 1
}
```

**For SHORT positions**, change `"direction"` to `"short"`.

### Take Profit Alert

When hitting take profit target:

```json
{
  "secret": "your-webhook-secret",
  "action": "take_profit",
  "ticker": "{{ticker}}",
  "price": {{close}}
}
```

### Stop Loss Alert

When hitting stop loss:

```json
{
  "secret": "your-webhook-secret",
  "action": "stop_loss",
  "ticker": "{{ticker}}",
  "price": {{close}}
}
```

## Creating Alerts in TradingView

### Method 1: Manual Alert Creation

1. **Open TradingView chart** for your desired ticker

2. **Click the Alert button** (bell icon) or press `Alt + A`

3. **Configure the alert condition:**
   - **Condition**: Choose your entry condition (e.g., "Crossing", "Greater Than", or use a custom indicator)
   - **Options**: "Once Per Bar Close" (recommended)

4. **Set up the webhook:**
   - **Alert name**: "AAPL Long Entry" (example)
   - **Message**: Paste the appropriate JSON from above
   - **Webhook URL**: `https://your-app-name.onrender.com/api/webhook`
   - Check "Webhook URL" checkbox

5. **Create the alert**

### Method 2: Strategy Alerts

If you're using a TradingView strategy:

1. **Open your strategy** on the chart

2. **Click Alert button** on the strategy panel

3. **Alert Message**: Use Pine Script placeholders

```json
{
  "secret": "your-webhook-secret",
  "action": "{{strategy.order.action}}",
  "ticker": "{{ticker}}",
  "price": {{strategy.order.price}},
  "direction": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}}
}
```

## Example Trading Setup

Here's a complete example for a moving average crossover strategy:

### Alert 1: Long Entry
**Condition**: SMA(9) crosses over SMA(21)
```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "direction": "long",
  "takeProfit": {{close}} * 1.03,
  "stopLoss": {{close}} * 0.98,
  "quantity": 1
}
```

### Alert 2: Take Profit
**Condition**: Price crosses over the take profit level
```json
{
  "secret": "your-webhook-secret",
  "action": "take_profit",
  "ticker": "{{ticker}}",
  "price": {{close}}
}
```

### Alert 3: Stop Loss
**Condition**: Price crosses under the stop loss level
```json
{
  "secret": "your-webhook-secret",
  "action": "stop_loss",
  "ticker": "{{ticker}}",
  "price": {{close}}
}
```

## TradingView Variables

You can use these TradingView placeholders in your alerts:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ticker}}` | Symbol/ticker | AAPL, BTCUSD |
| `{{close}}` | Close price | 150.25 |
| `{{open}}` | Open price | 149.50 |
| `{{high}}` | High price | 151.00 |
| `{{low}}` | Low price | 149.00 |
| `{{volume}}` | Volume | 1000000 |
| `{{time}}` | Timestamp | Unix timestamp |
| `{{timenow}}` | Current time | Unix timestamp |
| `{{interval}}` | Timeframe | 1, 5, 15, 60, D |

## Testing Your Alerts

### Test with Curl

Before creating TradingView alerts, test your endpoint:

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
    "stopLoss": 95.00,
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

### Test Alert in TradingView

1. Create a simple alert with a condition that will trigger immediately
2. Use a test ticker like "TEST"
3. Check your dashboard to see if the trade appears
4. Check Render logs to see if webhook was received

## Advanced Alert Strategies

### Dynamic Position Sizing

Calculate position size based on account risk:

```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "direction": "long",
  "takeProfit": {{close}} * 1.05,
  "stopLoss": {{close}} * 0.98,
  "quantity": {{strategy.order.contracts}}
}
```

### Multiple Take Profits

You can create multiple take profit alerts at different levels:

**TP1 (50% of position at 3% profit):**
```json
{
  "secret": "your-webhook-secret",
  "action": "take_profit",
  "ticker": "{{ticker}}",
  "price": {{close}}
}
```

Note: The current implementation closes the entire position. To support partial exits, you'd need to modify the webhook handler.

### Trailing Stop

Use TradingView's trailing stop feature with alert:

```json
{
  "secret": "your-webhook-secret",
  "action": "stop_loss",
  "ticker": "{{ticker}}",
  "price": {{close}}
}
```

## Common Issues

### Alert Not Triggering
- Check alert condition is correct
- Verify "Once Per Bar Close" is selected
- Check timeframe matches your strategy
- Ensure alert is active (green dot in alert list)

### Webhook Not Received
- Verify webhook URL is correct
- Check `WEBHOOK_SECRET` matches in both places
- View Render logs for incoming requests
- Ensure JSON is properly formatted (use a JSON validator)

### Wrong Ticker or Price
- Verify TradingView placeholders are correct
- Use `{{ticker}}` not hardcoded ticker names
- Use `{{close}}` for the closing price
- Check for extra spaces or characters

### Trade Not Appearing in Dashboard
- Check webhook response for errors
- View Render logs for processing errors
- Verify database connection is working
- Sign in to dashboard to see trades

## Best Practices

1. **Test Thoroughly**
   - Test alerts with small positions first
   - Use paper trading to validate
   - Monitor for a few days before going live

2. **Use Descriptive Names**
   - Name alerts clearly: "AAPL Long Entry", "AAPL TP", "AAPL SL"
   - Makes it easier to manage multiple alerts

3. **Set Expiration**
   - For specific trades, set alert expiration
   - Prevents old alerts from triggering

4. **Monitor Logs**
   - Regularly check Render logs
   - Verify webhooks are being processed
   - Watch for any errors

5. **Backup Strategy**
   - Don't rely solely on webhooks for trading
   - Have manual oversight
   - Set broker-level stop losses

6. **Secret Management**
   - Keep WEBHOOK_SECRET secure
   - Don't share publicly
   - Rotate periodically

## Alert Templates by Strategy Type

### Swing Trading
Entry when price breaks resistance:
```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "direction": "long",
  "takeProfit": {{close}} * 1.10,
  "stopLoss": {{close}} * 0.95,
  "quantity": 1
}
```

### Day Trading
Quick scalps with tight stops:
```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "direction": "long",
  "takeProfit": {{close}} * 1.02,
  "stopLoss": {{close}} * 0.995,
  "quantity": 1
}
```

### Crypto Trading
24/7 monitoring with percentage-based exits:
```json
{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "direction": "long",
  "takeProfit": {{close}} * 1.15,
  "stopLoss": {{close}} * 0.90,
  "quantity": 0.1
}
```

## Getting Help

If you're having trouble setting up alerts:

1. Check this guide thoroughly
2. Review TradingView's webhook documentation
3. Test with curl first before TradingView
4. Check Render logs for detailed errors
5. Open a GitHub issue with specific details

## Additional Resources

- [TradingView Alerts Documentation](https://www.tradingview.com/support/solutions/43000520149-i-want-to-know-more-about-alerts/)
- [TradingView Webhook URL](https://www.tradingview.com/support/solutions/43000529348-i-want-to-know-more-about-webhooks/)
- [TradingView Pine Script Variables](https://www.tradingview.com/pine-script-docs/en/v5/language/Execution_model.html)

# NQ Flag Breakout - Quick Reference Card

## File Locations
```
📁 nq-flag-breakout-indicator/
├── NQ_Flag_Breakout_Enhanced.pine  ← Main indicator script
├── STRATEGY_GUIDE.md               ← Full documentation
└── QUICK_REFERENCE.md              ← This file
```

---

## Installation

1. Open TradingView chart (NQ1! or MNQ1!, 2-minute timeframe)
2. Click "Pine Editor" at bottom
3. Copy contents of `NQ_Flag_Breakout_Enhanced.pine`
4. Click "Add to Chart"

---

## Three Preset Configurations

### 🎯 Conservative (Default) - Best for Beginners
```
Impulse: 2.0x ATR, 1.5x volume
Flag: Max 0.5 retrace, 1.2x ATR tight
Breakout: 1 confirm bar, volume ON
→ Fewer but higher quality signals
```

### ⚡ Aggressive - More Signals
```
Impulse: 1.5x ATR, 1.2x volume
Flag: Max 0.6 retrace, 1.5x ATR
Breakout: 0 confirm bars, 1.1x volume
→ More signals, more false positives
```

### 💎 Very Selective - Highest Quality
```
Impulse: 2.5x ATR, 2.0x volume
Flag: Max 0.4 retrace, 1.0x ATR
Breakout: 2 confirm bars, 1.5x volume
→ Rare but excellent setups
```

---

## Key Parameter Cheat Sheet

| Parameter | Default | Lower = | Higher = |
|-----------|---------|---------|----------|
| `impulseATRmult` | 2.0 | More signals | Stronger impulses only |
| `impulseVolMult` | 1.5 | More signals | Volume spikes required |
| `maxFlagHeight` | 0.5 | Tighter flags | Allows deeper retrace |
| `maxFlagATR` | 1.2 | Tighter consolidation | Looser consolidation |
| `confirmBars` | 1 | Faster entry | More confirmation |
| `breakoutVolMult` | 1.3 | Weaker volume OK | Strong volume required |

---

## What Makes a Good Flag?

### ✅ TAKE These Setups
- Sharp, clean impulse leg
- Tight consolidation (4-8 bars)
- Volume dries up during flag
- Breakout with volume expansion
- All EMAs aligned with trend
- Occurs during active hours (9 AM - 4 PM EST)

### ❌ SKIP These Setups
- Choppy, overlapping impulse
- Wide, sloppy flag
- Flag retraces 60%+ of pole
- Breakout on low volume
- EMAs crossing or flat
- Near major news releases

---

## Risk Management Quick Guide

### Position Sizing Formula
```
Risk Amount = Account × 1%
Stop Distance = Entry - Stop Loss (in points)
Position Size = Risk Amount / (Stop Distance × Point Value)

Example:
$10,000 account × 1% = $100 risk
Stop is 15 points away
MNQ: $100 / (15 × $2) = 3 contracts
```

### Stop Loss Methods
1. **Flag Extreme**: Tightest stop, below/above flag boundary
2. **ATR Based**: Gives more room, uses volatility
3. **Both (Tighter)**: Uses whichever is tighter ← Recommended

### Take Profit Methods
1. **Measured Move**: Projects pole height ← Most common
2. **ATR Multiple**: Uses 3x ATR target
3. **Risk-Reward**: Based on your desired RR (e.g., 2:1)

---

## Best Trading Hours (EST)

| Time | Quality | Notes |
|------|---------|-------|
| 9:30-9:35 | ❌ Avoid | Too volatile, wide spreads |
| 9:35-11:00 | ✅ Best | Clear trends, high volume |
| 11:00-2:00 | ⚠️ Caution | Lunch chop, lower volume |
| 2:00-4:00 | ✅ Good | Afternoon momentum |
| 4:00+ | ❌ Avoid | After hours, low liquidity |

**Before Major News**: Skip trading 10 min before/after FOMC, CPI, NFP

---

## Troubleshooting Decision Tree

```
No signals appearing?
├─ Is it 9 AM - 4 PM EST? → Enable session filter or adjust times
├─ Is market trending? → Flags don't work in choppy ranges
└─ Settings too strict? → Try "Aggressive" preset

Too many false signals?
├─ Increase confirmation bars (0 → 1 → 2)
├─ Tighten impulse (2.0 → 2.5 ATR)
└─ Enable flag slope validation

Getting stopped out often?
├─ Use "ATR Based" stop loss
├─ Increase ATR multiplier (1.5 → 2.0)
└─ Add more confirmation bars

Missing big moves?
├─ Use "Measured Move" take profit
├─ Increase measured move multiplier (1.0 → 1.5)
└─ Or trail stop after 1:1
```

---

## Reading the Chart Signals

### Visual Elements
- **Small ▲/▼**: Impulse leg detected
- **Shaded zones**: Active flag formation
- **Large LONG/SHORT**: Breakout signal
- **Blue labels**: Entry price
- **Red labels**: Stop loss
- **Green labels**: Take profit (+ RR ratio)

### When to Act
1. Wait for **LONG** or **SHORT** marker
2. Check that **entry/SL/TP labels** appear
3. Verify **RR ratio** is at least 1.5:1
4. Enter on **next bar open** or **current bar close**
5. Set stop and target in broker immediately

---

## Alert Setup (30 seconds)

1. Click indicator name → "⋯" → "Add alert on indicator"
2. Condition: Choose "Bull Flag Breakout" or "Bear Flag Breakout"
3. Trigger: "Once Per Bar Close"
4. Notification: Enable email/SMS/app
5. Click "Create"

Alert message includes Entry, SL, TP automatically!

---

## First Week Checklist

**Day 1-2**: Observation
- [ ] Load indicator with default settings
- [ ] Watch signals appear without trading
- [ ] Note which ones work vs. fail
- [ ] Check if too many/few signals

**Day 3-4**: Optimization
- [ ] Adjust settings based on observations
- [ ] Try different presets
- [ ] Fine-tune for your risk tolerance
- [ ] Document your final settings

**Day 5-7**: Paper Trading
- [ ] Trade every signal on paper
- [ ] Track entry, SL, TP, result
- [ ] Calculate win rate and avg RR
- [ ] Adjust if needed

**Week 2+**:
- [ ] Continue paper trading
- [ ] Build confidence
- [ ] Go live with 1 micro contract
- [ ] Scale up slowly

---

## Common Mistakes to Avoid

1. ❌ Trading outside active hours
2. ❌ Ignoring volume confirmation
3. ❌ Moving stops when losing
4. ❌ Taking every signal without discretion
5. ❌ Overleveraging position size
6. ❌ Not using higher timeframe context
7. ❌ Skipping the paper trading phase

---

## Key Metrics to Track

📊 Keep a trading journal with:
- Date & time of signal
- Direction (long/short)
- Entry price
- Stop loss
- Take profit
- Actual exit & P/L
- Notes (what worked/didn't)

**After 20 trades, calculate:**
- Win rate (aim for 50%+)
- Average RR (should be ≥ 1.5:1)
- Profit factor (wins ÷ losses, aim for ≥ 1.5)
- Max drawdown (consecutive losses)

---

## One-Page Trading Plan

**Setup Requirements:**
- Clean impulse (2x ATR, 1.5x volume)
- Tight flag (4-8 bars, <50% retrace)
- Volume contraction during flag
- Breakout with volume (1.3x avg)
- Session time 9:35 AM - 4:00 PM EST

**Entry:** Close of breakout bar

**Stop Loss:** Below/above flag extreme or 1.5 ATR

**Take Profit:** Measured move (1:1 pole projection)

**Position Size:** Risk 1% of account per trade

**Max Daily Loss:** Stop trading after -3% account

**Max Concurrent Trades:** 1 (let it finish before next)

---

## Resources

- **Full Documentation**: See `STRATEGY_GUIDE.md`
- **TradingView**: https://www.tradingview.com/
- **Pine Script Docs**: https://www.tradingview.com/pine-script-docs/
- **NQ Contract Specs**: CME Group website

---

## Quick Support

**Labels not showing?**
→ Enable "Show Entry/SL/TP Labels" in settings

**Too many labels cluttering chart?**
→ Disable "Show Entry/SL/TP Labels", use price cross plots only

**Want to test different settings quickly?**
→ Save multiple versions of indicator with different presets

**Need to convert to strategy for backtesting?**
→ Change `indicator()` to `strategy()` and add `strategy.entry()` calls

---

**Remember**: Flags are trend-continuation patterns. They work best when market has clear direction. On choppy days, fewer/no signals is actually good - the indicator is protecting you!

**Pro Tip**: Check the 15-minute and 1-hour charts before taking 2-minute flags. Best results when all timeframes agree on trend direction.

---

*Last updated: 2025-01-17*

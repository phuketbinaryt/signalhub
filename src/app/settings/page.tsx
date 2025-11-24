'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface PickMyTradeSettings {
  enabled: boolean;
  webhookUrls: string[];
  allowedTickers: string[];
  token: string;
  accountId: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tickers, setTickers] = useState<string[]>([]);
  const [settings, setSettings] = useState<PickMyTradeSettings>({
    enabled: false,
    webhookUrls: [],
    allowedTickers: [],
    token: '',
    accountId: '',
  });
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchTickers();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/pickmytrade');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickers = async () => {
    try {
      const response = await fetch('/api/tickers');
      if (response.ok) {
        const data = await response.json();
        setTickers(data.tickers);
      }
    } catch (error) {
      console.error('Error fetching tickers:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/settings/pickmytrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      alert('Settings saved successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addWebhookUrl = () => {
    if (newWebhookUrl.trim()) {
      setSettings({
        ...settings,
        webhookUrls: [...settings.webhookUrls, newWebhookUrl.trim()],
      });
      setNewWebhookUrl('');
    }
  };

  const removeWebhookUrl = (index: number) => {
    setSettings({
      ...settings,
      webhookUrls: settings.webhookUrls.filter((_, i) => i !== index),
    });
  };

  const toggleTicker = (ticker: string) => {
    const isSelected = settings.allowedTickers.includes(ticker);
    setSettings({
      ...settings,
      allowedTickers: isSelected
        ? settings.allowedTickers.filter((t) => t !== ticker)
        : [...settings.allowedTickers, ticker],
    });
  };

  const selectAllTickers = () => {
    setSettings({
      ...settings,
      allowedTickers: tickers,
    });
  };

  const deselectAllTickers = () => {
    setSettings({
      ...settings,
      allowedTickers: [],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo/logo.png"
              alt="Logo"
              width={200}
              height={200}
              className="object-contain"
              priority
            />
          </div>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Configure PickMyTrade integration</p>
        </div>

        {/* PickMyTrade Settings */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold">PickMyTrade Integration</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Forward entry signals to PickMyTrade for automated trading
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Token</label>
            <input
              type="text"
              value={settings.token}
              onChange={(e) => setSettings({ ...settings, token: e.target.value })}
              placeholder="G9d83ae8cbaff498fa6cf6"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Account ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Account ID</label>
            <input
              type="text"
              value={settings.accountId}
              onChange={(e) => setSettings({ ...settings, accountId: e.target.value })}
              placeholder="APEX7859600000813"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Webhook URLs */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL(s)</label>
            <div className="space-y-2">
              {settings.webhookUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    readOnly
                    className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-sm"
                  />
                  <Button
                    onClick={() => removeWebhookUrl(index)}
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addWebhookUrl()}
                  placeholder="https://api.pickmytrade.com/webhook"
                  className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button onClick={addWebhookUrl} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add URL
                </Button>
              </div>
            </div>
          </div>

          {/* Allowed Tickers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Forward Tickers (leave empty for all)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllTickers}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <span className="text-xs text-muted-foreground">|</span>
                <button
                  onClick={deselectAllTickers}
                  className="text-xs text-primary hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="bg-secondary border border-border rounded-lg p-4">
              {tickers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tickers available. Create trades to see tickers here.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {tickers.map((ticker) => (
                    <label
                      key={ticker}
                      className="flex items-center gap-2 cursor-pointer hover:bg-background/50 rounded p-2 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={settings.allowedTickers.includes(ticker)}
                        onChange={() => toggleTicker(ticker)}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                      />
                      <span className="text-sm">{ticker}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.allowedTickers.length === 0
                ? 'All tickers will be forwarded'
                : `${settings.allowedTickers.length} ticker(s) selected`}
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-accent/10 border border-accent/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">ℹ️ How it works</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Only <strong>entry signals</strong> are forwarded to PickMyTrade</li>
            <li>• Take Profit and Stop Loss alerts are not forwarded</li>
            <li>• Ticker filtering applies to all configured webhook URLs</li>
            <li>• Trades are sent with order type "MKT" (market orders)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

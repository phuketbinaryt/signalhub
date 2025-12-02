'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Plus, X, Edit2, Trash2, Pause, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface PickMyTradeConfig {
  id: number;
  name: string;
  enabled: boolean;
  webhookUrls: string[];
  allowedTickers: string[]; // Deprecated
  strategyFilters: Record<string, string[]>;
  contractMapping: Record<string, string>;
  token: string;
  accountId: string;
  riskPercentage: number;
  roundingMode: string;
  pausedUntil: string | null;
}

interface TickerStrategy {
  ticker: string;
  strategies: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerStrategies, setTickerStrategies] = useState<TickerStrategy[]>([]);
  const [configs, setConfigs] = useState<PickMyTradeConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<PickMyTradeConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [formData, setFormData] = useState<Partial<PickMyTradeConfig>>({
    name: '',
    enabled: true,
    webhookUrls: [],
    strategyFilters: {},
    contractMapping: {},
    token: '',
    accountId: '',
    riskPercentage: 100,
    roundingMode: 'down',
  });

  useEffect(() => {
    // Check if already authenticated in this session
    const isAuth = sessionStorage.getItem('settings-authenticated') === 'true';
    if (isAuth) {
      setAuthenticated(true);
      fetchConfigs();
      fetchTickers();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/verify-settings-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        sessionStorage.setItem('settings-authenticated', 'true');
        setAuthenticated(true);
        setPassword('');
        await fetchConfigs();
        await fetchTickers();
      } else {
        const error = await response.json();
        setAuthError(error.error || 'Incorrect password');
      }
    } catch (error) {
      setAuthError('Failed to verify password');
    } finally {
      setVerifying(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/settings/pickmytrade');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
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
        setTickerStrategies(data.tickerStrategies || []);
      }
    } catch (error) {
      console.error('Error fetching tickers:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      enabled: true,
      webhookUrls: [],
      strategyFilters: {},
      token: '',
      accountId: '',
      riskPercentage: 100,
      roundingMode: 'down',
    });
    setShowForm(true);
  };

  const handleEdit = (config: PickMyTradeConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      enabled: config.enabled,
      webhookUrls: config.webhookUrls,
      strategyFilters: config.strategyFilters || {},
      contractMapping: config.contractMapping || {},
      token: config.token,
      accountId: config.accountId,
      riskPercentage: config.riskPercentage,
      roundingMode: config.roundingMode,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/pickmytrade/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete config');
      }

      await fetchConfigs();
      alert('Config deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to delete config');
    }
  };

  const handlePauseToggle = async (config: PickMyTradeConfig) => {
    try {
      const response = await fetch(`/api/settings/pickmytrade/${config.id}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle pause');
      }

      await fetchConfigs();
    } catch (error: any) {
      alert(error.message || 'Failed to toggle pause');
    }
  };

  const isPaused = (config: PickMyTradeConfig) => {
    return config.pausedUntil && new Date(config.pausedUntil) > new Date();
  };

  const formatPausedUntil = (pausedUntil: string) => {
    return new Date(pausedUntil).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate
      if (!formData.name || !formData.token || !formData.accountId) {
        alert('Please fill in all required fields');
        return;
      }

      if (!formData.webhookUrls || formData.webhookUrls.length === 0) {
        alert('Please add at least one webhook URL');
        return;
      }

      const url = editingConfig
        ? `/api/settings/pickmytrade/${editingConfig.id}`
        : '/api/settings/pickmytrade';

      const method = editingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save config');
      }

      await fetchConfigs();
      setShowForm(false);
      alert(`Config ${editingConfig ? 'updated' : 'created'} successfully!`);
    } catch (error: any) {
      alert(error.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const addWebhookUrl = () => {
    if (newWebhookUrl.trim()) {
      setFormData({
        ...formData,
        webhookUrls: [...(formData.webhookUrls || []), newWebhookUrl.trim()],
      });
      setNewWebhookUrl('');
    }
  };

  const removeWebhookUrl = (index: number) => {
    setFormData({
      ...formData,
      webhookUrls: (formData.webhookUrls || []).filter((_, i) => i !== index),
    });
  };

  // Toggle entire ticker (all strategies)
  const toggleTicker = (ticker: string) => {
    const filters = { ...(formData.strategyFilters || {}) };
    if (filters[ticker]) {
      // Remove ticker
      delete filters[ticker];
    } else {
      // Add ticker with all strategies (empty array)
      filters[ticker] = [];
    }
    setFormData({
      ...formData,
      strategyFilters: filters,
    });
  };

  // Toggle specific strategy for a ticker
  const toggleStrategy = (ticker: string, strategy: string) => {
    const filters = { ...(formData.strategyFilters || {}) };

    if (!filters[ticker]) {
      // Ticker not selected yet, add with this strategy
      filters[ticker] = [strategy];
    } else if (filters[ticker].length === 0) {
      // Currently all strategies selected, switch to just this one
      filters[ticker] = [strategy];
    } else {
      // Some strategies selected
      const strategies = [...filters[ticker]];
      const index = strategies.indexOf(strategy);
      if (index > -1) {
        // Remove strategy
        strategies.splice(index, 1);
        if (strategies.length === 0) {
          // If no strategies left, remove ticker entirely
          delete filters[ticker];
        } else {
          filters[ticker] = strategies;
        }
      } else {
        // Add strategy
        filters[ticker] = [...strategies, strategy];
      }
    }

    setFormData({
      ...formData,
      strategyFilters: filters,
    });
  };

  // Toggle between all strategies and specific strategies for a ticker
  const selectAllStrategiesForTicker = (ticker: string) => {
    const filters = { ...(formData.strategyFilters || {}) };
    const currentStrategies = filters[ticker] || [];

    if (currentStrategies.length === 0) {
      // Currently "all strategies", switch to first strategy only
      const tickerData = tickerStrategies.find(ts => ts.ticker === ticker);
      if (tickerData && tickerData.strategies.length > 0) {
        filters[ticker] = [tickerData.strategies[0]];
      }
    } else {
      // Currently specific strategies, switch to all strategies
      filters[ticker] = [];
    }

    setFormData({
      ...formData,
      strategyFilters: filters,
    });
  };

  // Check if ticker is selected (with or without strategies)
  const isTickerSelected = (ticker: string) => {
    return !!(formData.strategyFilters || {})[ticker];
  };

  // Check if all strategies are selected for a ticker
  const isAllStrategiesSelected = (ticker: string) => {
    const strategies = (formData.strategyFilters || {})[ticker];
    return strategies && strategies.length === 0;
  };

  // Check if specific strategy is selected
  const isStrategySelected = (ticker: string, strategy: string) => {
    const strategies = (formData.strategyFilters || {})[ticker];
    if (!strategies) return false;
    if (strategies.length === 0) return true; // All strategies selected
    return strategies.includes(strategy);
  };

  const selectAllTickers = () => {
    const filters: Record<string, string[]> = {};
    tickerStrategies.forEach((ts) => {
      filters[ts.ticker] = []; // Empty array = all strategies
    });
    setFormData({
      ...formData,
      strategyFilters: filters,
    });
  };

  const deselectAllTickers = () => {
    setFormData({
      ...formData,
      strategyFilters: {},
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!authenticated) {
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

        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
          <div className="bg-card border border-border rounded-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-2">Settings Access</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter password to access settings
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter settings password"
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  disabled={verifying}
                />
              </div>
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button
                type="submit"
                disabled={verifying || !password}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {verifying ? 'Verifying...' : 'Access Settings'}
              </Button>
            </form>
          </div>
        </div>
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

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">PickMyTrade Settings</h1>
            <p className="text-muted-foreground">Manage multiple PickMyTrade configurations</p>
          </div>
          {!showForm && (
            <Button onClick={handleCreateNew} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Configuration
            </Button>
          )}
        </div>

        {showForm ? (
          /* Config Form */
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-xl font-semibold">
                {editingConfig ? 'Edit Configuration' : 'New Configuration'}
              </h2>
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Configuration Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Trading Account"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable this configuration</label>
                <p className="text-xs text-muted-foreground">Turn off to temporarily disable forwarding</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium">API Token *</label>
              <input
                type="text"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="Abc123xyz789token456"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Account ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Account ID *</label>
              <input
                type="text"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                placeholder="DEMO1234567890123"
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Risk Percentage */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Risk Percentage</label>
              <p className="text-xs text-muted-foreground mb-2">
                Percentage of TradingView quantity to send (e.g., 50% of 3 contracts = 1.5 contracts)
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.riskPercentage}
                  onChange={(e) => setFormData({ ...formData, riskPercentage: parseFloat(e.target.value) || 100 })}
                  className="w-32 bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">%</span>
              </div>
            </div>

            {/* Rounding Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rounding Mode</label>
              <p className="text-xs text-muted-foreground mb-2">
                How to round fractional quantities (e.g., 50% of 3 = 1.5 → Round Up: 2, Round Down: 1)
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="down"
                    checked={formData.roundingMode === 'down'}
                    onChange={(e) => setFormData({ ...formData, roundingMode: e.target.value })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Round Down</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="up"
                    checked={formData.roundingMode === 'up'}
                    onChange={(e) => setFormData({ ...formData, roundingMode: e.target.value })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Round Up</span>
                </label>
              </div>
            </div>

            {/* Webhook URLs */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook URL(s) *</label>
              <div className="space-y-2">
                {(formData.webhookUrls || []).map((url, index) => (
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
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Ticker & Strategy Filters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Forward Tickers & Strategies *
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
                {tickerStrategies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tickers available. Create trades to see tickers here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tickerStrategies.map((ts) => (
                      <div key={ts.ticker} className="border border-border rounded-lg">
                        {/* Ticker Row */}
                        <div className="flex items-center gap-2 p-3 bg-background/50">
                          <input
                            type="checkbox"
                            checked={isTickerSelected(ts.ticker)}
                            onChange={() => toggleTicker(ts.ticker)}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium flex-1">{ts.ticker}</span>
                          {isTickerSelected(ts.ticker) && (
                            <span className="text-xs text-muted-foreground">
                              {isAllStrategiesSelected(ts.ticker)
                                ? 'All strategies'
                                : `${(formData.strategyFilters?.[ts.ticker] || []).length} selected`}
                            </span>
                          )}
                        </div>

                        {/* Strategies (show if ticker has multiple strategies) */}
                        {ts.strategies.length > 1 && isTickerSelected(ts.ticker) && (
                          <div className="p-3 pt-0 space-y-2">
                            <button
                              onClick={() => selectAllStrategiesForTicker(ts.ticker)}
                              className="text-xs text-primary hover:underline mb-2"
                            >
                              {isAllStrategiesSelected(ts.ticker) ? 'Select Specific' : 'All Strategies'}
                            </button>
                            {!isAllStrategiesSelected(ts.ticker) && (
                              <div className="grid grid-cols-1 gap-2 pl-6">
                                {ts.strategies.map((strategy) => (
                                  <label
                                    key={strategy}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-background/50 rounded p-2 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isStrategySelected(ts.ticker, strategy)}
                                      onChange={() => toggleStrategy(ts.ticker, strategy)}
                                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                                    />
                                    <span className="text-xs">{strategy}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {Object.keys(formData.strategyFilters || {}).length === 0
                  ? '⚠️ No tickers selected - no signals will be forwarded'
                  : `${Object.keys(formData.strategyFilters || {}).length} ticker(s) configured`}
              </p>
            </div>

            {/* Contract Mapping */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Contract Names (Optional)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Map ticker symbols to specific contract names for PickMyTrade (e.g., MGC1! → MGCG6)
              </p>
              <div className="bg-secondary border border-border rounded-lg p-4">
                {Object.keys(formData.strategyFilters || {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select tickers above to configure contract mappings
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.keys(formData.strategyFilters || {}).map((ticker) => (
                      <div key={ticker} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24">{ticker}</span>
                        <span className="text-sm text-muted-foreground">→</span>
                        <input
                          type="text"
                          value={formData.contractMapping?.[ticker] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            contractMapping: {
                              ...formData.contractMapping,
                              [ticker]: e.target.value
                            }
                          })}
                          placeholder={`Contract name (default: ${ticker})`}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use the original ticker name
              </p>
            </div>

            {/* Debug: Show current strategy filters */}
            <div className="space-y-2 bg-secondary/50 border border-border rounded-lg p-4">
              <label className="text-sm font-medium text-muted-foreground">Debug: Current Filter Configuration</label>
              <pre className="text-xs bg-background p-3 rounded overflow-x-auto max-h-32">
                {JSON.stringify(formData.strategyFilters, null, 2) || '{}'}
              </pre>
              <p className="text-xs text-muted-foreground">
                Empty array [] = all strategies allowed. Specific array = only those strategies allowed.
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
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        ) : (
          /* Config List */
          <>
            {configs.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <p className="text-muted-foreground mb-4">No configurations yet</p>
                <Button onClick={handleCreateNew} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Configuration
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="bg-card border border-border rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{config.name}</h3>
                        {config.enabled ? (
                          <span className="px-2 py-1 rounded text-xs bg-success/20 text-success border border-success/30">
                            Enabled
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
                            Disabled
                          </span>
                        )}
                        {isPaused(config) && (
                          <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Paused until {formatPausedUntil(config.pausedUntil!)} ET
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePauseToggle(config)}
                          variant="outline"
                          size="sm"
                          className={`gap-2 ${isPaused(config) ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}
                          title={isPaused(config) ? 'Resume forwarding' : 'Pause until next session (18:00 ET)'}
                        >
                          {isPaused(config) ? (
                            <>
                              <Play className="w-4 h-4" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleEdit(config)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(config.id, config.name)}
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Token</p>
                        <p className="font-mono">{config.token}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Account ID</p>
                        <p className="font-mono">{config.accountId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Risk Settings</p>
                        <p>
                          {config.riskPercentage}% risk, {config.roundingMode === 'up' ? 'Round Up' : 'Round Down'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Webhook URLs</p>
                        <p>{config.webhookUrls.length} configured</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Ticker Filters</p>
                        <p>
                          {Object.keys(config.strategyFilters || {}).length === 0
                            ? 'None - no forwarding'
                            : `${Object.keys(config.strategyFilters || {}).length} configured`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Contract Mappings</p>
                        <p>
                          {Object.keys(config.contractMapping || {}).filter(k => config.contractMapping[k]).length === 0
                            ? 'None'
                            : `${Object.keys(config.contractMapping || {}).filter(k => config.contractMapping[k]).length} configured`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-accent/10 border border-accent/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">ℹ️ How it works</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Each configuration can have its own token, account, risk settings, and ticker filters</li>
            <li>• <strong>Risk percentage</strong> adjusts contract quantity (e.g., 50% of 3 contracts = 1.5, rounded to 1 or 2)</li>
            <li>• Only <strong>entry signals</strong> are forwarded to PickMyTrade</li>
            <li>• Take Profit and Stop Loss alerts are not forwarded</li>
            <li>• Disabled configurations will be skipped during forwarding</li>
            <li>• <strong>Pause</strong> temporarily stops forwarding until the next trading session (18:00 ET)</li>
            <li>• All enabled configurations receive matching signals simultaneously</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Plus, X, Edit2, Trash2, Pause, Play, RefreshCw, Search, Trash } from 'lucide-react';
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

interface AppLog {
  id: number;
  level: string;
  category: string;
  message: string;
  metadata: Record<string, any> | null;
  createdAt: string;
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
  const [customStrategyInputs, setCustomStrategyInputs] = useState<Record<string, string>>({});

  // Log viewer state
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState({ level: 'all', category: 'all', search: '' });
  const [logsTotal, setLogsTotal] = useState(0);

  // Webhook tester state
  const [testPayload, setTestPayload] = useState('🚀 CL1! BUY Signal | Entry: 68.50 | SL: 68.00 | TP: 69.50 | Contracts: 2 | Strategy: CL-5M');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

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

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (logFilter.level !== 'all') params.set('level', logFilter.level);
      if (logFilter.category !== 'all') params.set('category', logFilter.category);
      if (logFilter.search) params.set('search', logFilter.search);

      const response = await fetch(`/api/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setLogsTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;

    try {
      const response = await fetch('/api/logs', { method: 'DELETE' });
      if (response.ok) {
        setLogs([]);
        setLogsTotal(0);
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const testWebhook = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: testPayload,
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
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

  // Add a custom strategy to a ticker
  const addCustomStrategy = (ticker: string) => {
    const strategyName = (customStrategyInputs[ticker] || '').trim();
    if (!strategyName) return;

    const filters = { ...(formData.strategyFilters || {}) };

    // If ticker is not selected, add it with this strategy
    if (!filters[ticker]) {
      filters[ticker] = [strategyName];
    } else if (filters[ticker].length === 0) {
      // Currently "all strategies", switch to just this custom one
      filters[ticker] = [strategyName];
    } else {
      // Add to existing strategies if not already present
      if (!filters[ticker].includes(strategyName)) {
        filters[ticker] = [...filters[ticker], strategyName];
      }
    }

    setFormData({
      ...formData,
      strategyFilters: filters,
    });

    // Clear the input
    setCustomStrategyInputs({
      ...customStrategyInputs,
      [ticker]: '',
    });
  };

  // Get all strategies for a ticker (known + custom)
  const getAllStrategiesForTicker = (ticker: string) => {
    const tickerData = tickerStrategies.find(ts => ts.ticker === ticker);
    const knownStrategies = tickerData?.strategies || [];
    const selectedStrategies = formData.strategyFilters?.[ticker] || [];

    // Combine known strategies with any custom ones that have been added
    const allStrategies = new Set([...knownStrategies, ...selectedStrategies]);
    return Array.from(allStrategies);
  };

  // Remove a custom strategy from a ticker
  const removeStrategy = (ticker: string, strategy: string) => {
    const filters = { ...(formData.strategyFilters || {}) };
    if (!filters[ticker]) return;

    filters[ticker] = filters[ticker].filter(s => s !== strategy);

    // If no strategies left, remove the ticker entirely
    if (filters[ticker].length === 0) {
      delete filters[ticker];
    }

    setFormData({
      ...formData,
      strategyFilters: filters,
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

                        {/* Strategies (show when ticker is selected) */}
                        {isTickerSelected(ts.ticker) && (
                          <div className="p-3 pt-0 space-y-2">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => selectAllStrategiesForTicker(ts.ticker)}
                                className="text-xs text-primary hover:underline"
                              >
                                {isAllStrategiesSelected(ts.ticker) ? 'Select Specific' : 'All Strategies'}
                              </button>
                            </div>
                            {!isAllStrategiesSelected(ts.ticker) && (
                              <>
                                {/* Strategy list */}
                                <div className="grid grid-cols-1 gap-2 pl-6">
                                  {getAllStrategiesForTicker(ts.ticker).map((strategy) => {
                                    const isKnown = ts.strategies.includes(strategy);
                                    return (
                                      <div
                                        key={strategy}
                                        className="flex items-center gap-2 hover:bg-background/50 rounded p-2 transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isStrategySelected(ts.ticker, strategy)}
                                          onChange={() => toggleStrategy(ts.ticker, strategy)}
                                          className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                                        />
                                        <span className="text-xs flex-1">{strategy}</span>
                                        {!isKnown && (
                                          <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                                            custom
                                          </span>
                                        )}
                                        {!isKnown && (
                                          <button
                                            onClick={() => removeStrategy(ts.ticker, strategy)}
                                            className="text-xs text-destructive hover:underline"
                                          >
                                            remove
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Add custom strategy input */}
                                <div className="flex gap-2 pl-6 mt-2">
                                  <input
                                    type="text"
                                    value={customStrategyInputs[ts.ticker] || ''}
                                    onChange={(e) => setCustomStrategyInputs({
                                      ...customStrategyInputs,
                                      [ts.ticker]: e.target.value,
                                    })}
                                    onKeyPress={(e) => e.key === 'Enter' && addCustomStrategy(ts.ticker)}
                                    placeholder="Add custom strategy name..."
                                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <button
                                    onClick={() => addCustomStrategy(ts.ticker)}
                                    className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90"
                                  >
                                    Add
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground pl-6">
                                  Add strategy names before they generate signals
                                </p>
                              </>
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

        {/* Log Viewer */}
        <div className="mt-10 border-t border-border pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Activity Logs</h2>
              <p className="text-sm text-muted-foreground">
                {logsTotal > 0 ? `${logsTotal} log entries` : 'No logs yet'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchLogs}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={logsLoading}
              >
                <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10"
              >
                <Trash className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select
              value={logFilter.level}
              onChange={(e) => setLogFilter({ ...logFilter, level: e.target.value })}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <select
              value={logFilter.category}
              onChange={(e) => setLogFilter({ ...logFilter, category: e.target.value })}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              <option value="webhook">Webhook</option>
              <option value="telegram">Telegram</option>
              <option value="pickmytrade">PickMyTrade</option>
              <option value="push">Push</option>
              <option value="system">System</option>
            </select>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={logFilter.search}
                  onChange={(e) => setLogFilter({ ...logFilter, search: e.target.value })}
                  placeholder="Search logs..."
                  className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <Button onClick={fetchLogs} size="sm" className="gap-2">
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>

          {/* Logs Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {logsLoading ? 'Loading...' : 'No logs found. Logs will appear here when webhooks are received.'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Level</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Message</th>
                      <th className="text-left p-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/30">
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                            log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3">{log.message}</td>
                        <td className="p-3 text-muted-foreground">
                          {log.metadata && (
                            <span className="text-xs font-mono">
                              {log.metadata.ticker && `${log.metadata.ticker} `}
                              {log.metadata.strategy && `• ${log.metadata.strategy} `}
                              {log.metadata.configName && `• ${log.metadata.configName} `}
                              {log.metadata.error && <span className="text-red-400">{log.metadata.error}</span>}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Webhook Tester */}
        <div className="mt-10 border-t border-border pt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Webhook Tester</h2>
            <p className="text-sm text-muted-foreground">
              Test how your webhook payload will be parsed without creating trades
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Webhook Payload</label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={4}
                placeholder="Paste your webhook payload here..."
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the exact text that TradingView sends to test parsing
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testWebhook}
                disabled={testLoading || !testPayload.trim()}
                className="gap-2"
              >
                {testLoading ? 'Testing...' : 'Test Parsing'}
              </Button>
              <Button
                onClick={() => setTestPayload('🚀 CL1! BUY Signal | Entry: 68.50 | SL: 68.00 | TP: 69.50 | Contracts: 2 | Strategy: CL-5M')}
                variant="outline"
                size="sm"
              >
                Load Example
              </Button>
            </div>

            {testResult && (
              <div className="space-y-3">
                {/* Parse Status */}
                <div className={`p-3 rounded-lg ${testResult.parseSuccess ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <p className={`text-sm font-medium ${testResult.parseSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testResult.parseSuccess ? '✓ Payload parsed successfully' : '✗ Failed to parse payload'}
                  </p>
                </div>

                {/* Parsed Payload */}
                {testResult.parsedPayload && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Parsed Result</h4>
                    <div className="bg-secondary rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Action:</span> <span className="text-white">{testResult.parsedPayload.action || '-'}</span></div>
                      <div><span className="text-muted-foreground">Ticker:</span> <span className="text-white">{testResult.parsedPayload.ticker || '-'}</span></div>
                      <div><span className="text-muted-foreground">Price:</span> <span className="text-cyan-400">{testResult.parsedPayload.price || '-'}</span></div>
                      <div><span className="text-muted-foreground">Direction:</span> <span className={testResult.parsedPayload.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}>{testResult.parsedPayload.direction || '-'}</span></div>
                      <div><span className="text-muted-foreground">Strategy:</span> <span className="text-primary font-medium">{testResult.parsedPayload.strategy || '-'}</span></div>
                      <div><span className="text-muted-foreground">Quantity:</span> <span className="text-white">{testResult.parsedPayload.quantity || '-'}</span></div>
                      <div><span className="text-muted-foreground">Stop Loss:</span> <span className="text-white">{testResult.parsedPayload.stopLoss || '-'}</span></div>
                      <div><span className="text-muted-foreground">Take Profit:</span> <span className="text-white">{testResult.parsedPayload.takeProfit || '-'}</span></div>
                    </div>
                  </div>
                )}

                {/* Strategy Debug */}
                {testResult.strategyDebug && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Strategy Extraction Debug</h4>
                    <div className="bg-secondary rounded-lg p-3 space-y-2 text-sm font-mono">
                      <div>
                        <span className="text-muted-foreground">Pattern:</span>{' '}
                        <span className="text-amber-400">{testResult.strategyDebug.regexPattern}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Extracted:</span>{' '}
                        <span className={testResult.strategyDebug.extractedStrategy ? 'text-emerald-400' : 'text-red-400'}>
                          {testResult.strategyDebug.extractedStrategy || 'null (not found)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Text around Strategy:</span>
                        <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                          {testResult.strategyDebug.textAroundStrategy}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw Details */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-white">
                    View full response
                  </summary>
                  <pre className="mt-2 bg-secondary p-3 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

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

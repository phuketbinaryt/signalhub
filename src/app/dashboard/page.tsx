'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { ToggleGroup } from '@/components/ToggleGroup';
import { PerformanceCharts } from '@/components/PerformanceCharts';
import { Button } from '@/components/ui/button';
import { ActionsDropdown } from '@/components/ActionsDropdown';
import { SoundSettings } from '@/components/SoundSettings';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { OpenTradesTable } from '@/components/OpenTradesTable';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';
import { TrendingUp, TrendingDown, Settings } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface TradeData {
  trades: any[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    overall: {
      totalTrades: number;
      openTrades: number;
      closedTrades: number;
      totalPnl: number;
      winningTrades: number;
      losingTrades: number;
      winRate: number;
      avgWin: number;
      avgLoss: number;
    };
    byTicker: any[];
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [tradeData, setTradeData] = useState<TradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState('all');
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'time' | 'ticker'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const TRADES_PER_PAGE = 25;

  // Sound notifications
  const { soundEnabled, setSoundEnabled, volume, setVolume, playSound } = useSoundNotifications();

  useEffect(() => {
    fetchTrades();
  }, [selectedTicker, selectedStrategy, statusFilter, timePeriod, currentPage]);

  // Fallback: Auto-refresh every 30 seconds (reliable for serverless)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh (30s polling)');
      fetchTrades();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedTicker, selectedStrategy, statusFilter, timePeriod, currentPage]);

  // Real-time updates via Server-Sent Events with auto-reconnect (bonus when it works)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000; // Max 30 seconds between reconnects

    const connect = () => {
      // Clean up existing connection
      if (eventSource) {
        eventSource.close();
      }

      console.log('🔌 Connecting to SSE...');
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        console.log('✅ SSE connected');
        reconnectAttempts = 0; // Reset on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'trade_update') {
            console.log('📡 Real-time update received:', data);

            // Play sound notification
            if (data.action) {
              playSound(data.action);
            }

            // Refresh trades when new signal comes in
            fetchTrades();
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error, will reconnect...', error);
        eventSource?.close();

        // Exponential backoff for reconnection
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        console.log(`⏳ Reconnecting in ${delay / 1000} seconds (attempt ${reconnectAttempts})...`);

        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      };
    };

    // Initial connection
    connect();

    // Cleanup
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedTicker, selectedStrategy, statusFilter, timePeriod, currentPage, playSound]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedTicker !== 'all') {
        params.append('ticker', selectedTicker);
      }

      if (selectedStrategy !== 'all') {
        params.append('strategy', selectedStrategy);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (timePeriod !== 'all') {
        params.append('period', timePeriod);
      }

      // Add pagination params
      params.append('limit', TRADES_PER_PAGE.toString());
      params.append('offset', ((currentPage - 1) * TRADES_PER_PAGE).toString());

      const response = await fetch(`/api/trades?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const data = await response.json();
      setTradeData(data);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tradeId: number) => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return;
    }

    try {
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trade');
      }

      // Refresh the trades list
      await fetchTrades();
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('Failed to delete trade. Please try again.');
    }
  };

  const stats = tradeData?.stats.overall;
  const byTicker = tradeData?.stats.byTicker || [];

  // Sort trades based on selected sort option
  const trades = (tradeData?.trades || []).sort((a: any, b: any) => {
    if (sortBy === 'time') {
      const timeA = new Date(a.openedAt).getTime();
      const timeB = new Date(b.openedAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
    // ticker sort
    return sortOrder === 'desc'
      ? b.ticker.localeCompare(a.ticker)
      : a.ticker.localeCompare(b.ticker);
  });

  const handleSort = (column: 'time' | 'ticker') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Generate consistent color for ticker badge
  const getTickerColor = (ticker: string) => {
    const colors = [
      'rgb(59, 130, 246)', // blue
      'rgb(16, 185, 129)', // green
      'rgb(249, 115, 22)', // orange
      'rgb(168, 85, 247)', // purple
      'rgb(236, 72, 153)', // pink
      'rgb(251, 191, 36)', // yellow
      'rgb(20, 184, 166)', // teal
      'rgb(239, 68, 68)', // red
    ];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get unique tickers and strategies for dropdowns
  const tickers = Array.from(new Set(trades.map((t: any) => t.ticker)));
  const strategies = Array.from(new Set(trades.map((t: any) => t.strategy).filter(Boolean)));

  // Prepare chart data
  const plOverTimeData = trades
    .filter((t: any) => t.status === 'closed' && t.closedAt)
    .map((t: any) => ({
      date: new Date(t.closedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      pnl: t.pnl || 0,
    }))
    .slice(0, 7)
    .reverse();

  const tickerPerformanceData = byTicker.map((t: any) => ({
    ticker: t.ticker,
    pnl: t.totalPnl || 0,
    trades: t.totalTrades || 0,
  }));

  const winLossData = [
    { name: 'Wins', value: stats?.winningTrades || 0, count: stats?.winningTrades || 0, total: stats?.closedTrades || 1 },
    { name: 'Losses', value: stats?.losingTrades || 0, count: stats?.losingTrades || 0, total: stats?.closedTrades || 1 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PWAInstallPrompt />
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">State:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-secondary border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <SoundSettings
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              volume={volume}
              setVolume={setVolume}
            />
            <PushNotificationButton />
            <Button
              onClick={() => router.push('/settings')}
              variant="outline"
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button onClick={fetchTrades} className="bg-primary hover:bg-primary/90">
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Filters Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Ticker:</span>
            <select
              value={selectedTicker}
              onChange={(e) => {
                setSelectedTicker(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
            >
              <option value="all">All Tickers</option>
              {tickers.map((ticker: string) => (
                <option key={ticker} value={ticker}>
                  {ticker}
                </option>
              ))}
            </select>

            <span className="text-sm text-muted-foreground">Strategy:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => {
                setSelectedStrategy(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px]"
            >
              <option value="all">All Strategies</option>
              {strategies.map((strategy: string) => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Period:</span>
            <ToggleGroup
              options={[
                { value: 'daily', label: 'Session' },
                { value: 'previous_session', label: 'Prev Session' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'all', label: 'All Time' }
              ]}
              value={timePeriod}
              onChange={(value) => {
                setTimePeriod(value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Open Trades Table */}
            <OpenTradesTable
              trades={trades.filter((t: any) => t.status === 'open')}
              getTickerColor={getTickerColor}
            />

            {/* Recent Trades Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold">Recent Trades</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Ticker</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Strategy</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Dir</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Qty</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Entry</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Exit</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">SL</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">TP</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">P&L</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">P&L %</th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                      <th
                        className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSort('time')}
                      >
                        Time {sortBy === 'time' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="px-2 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade: any, index: number) => {
                      const tickerColor = getTickerColor(trade.ticker);
                      return (
                      <tr key={index} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-2 py-3">
                          <span
                            className="inline-flex px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              color: tickerColor,
                              borderColor: tickerColor,
                              backgroundColor: `${tickerColor}15`,
                              border: `1px solid ${tickerColor}`,
                            }}
                          >
                            {trade.ticker}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          {trade.strategy ? (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-accent/20 text-accent-foreground whitespace-nowrap">
                              {trade.strategy}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                            trade.direction === 'short'
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-success/20 text-success'
                          }`}>
                            {trade.direction === 'short' ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <TrendingUp className="w-3 h-3" />
                            )}
                            {trade.direction === 'short' ? 'SHORT' : 'LONG'}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-sm">{trade.quantity}</td>
                        <td className="px-2 py-3 text-sm text-primary">${trade.entryPrice.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm text-primary">
                          {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-2 py-3 text-sm text-primary">{trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : '-'}</td>
                        <td className="px-2 py-3 text-sm text-primary">{trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '-'}</td>
                        <td className="px-2 py-3">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-muted text-foreground">
                            {trade.status.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-2 py-3 text-sm ${(trade.pnl || 0) < 0 ? 'text-destructive' : 'text-success'}`}>
                          {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-2 py-3 text-sm ${(trade.pnlPercent || 0) < 0 ? 'text-destructive' : 'text-success'}`}>
                          {trade.pnlPercent ? `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-2 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(trade.openedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                        </td>
                        <td className="px-2 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(trade.openedAt).toLocaleTimeString('en-US', {
                            timeZone: 'America/New_York',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="px-2 py-3">
                          <ActionsDropdown onDelete={() => handleDelete(trade.id)} />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {tradeData && tradeData.pagination && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * TRADES_PER_PAGE) + 1} to{' '}
                    {Math.min(currentPage * TRADES_PER_PAGE, tradeData.pagination.total)} of{' '}
                    {tradeData.pagination.total} trades
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(tradeData.pagination.total / TRADES_PER_PAGE) }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          const totalPages = Math.ceil(tradeData.pagination.total / TRADES_PER_PAGE);
                          return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there's a gap
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                              <Button
                                onClick={() => setCurrentPage(page)}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className={currentPage === page ? "bg-primary hover:bg-primary/90" : ""}
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                    <Button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!tradeData.pagination.hasMore}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                label="Total Trades"
                value={stats?.totalTrades || 0}
                subtitle="Signals Processed"
              />
              <StatCard
                label="Total P&L"
                value={`$${(stats?.totalPnl || 0).toFixed(2)}`}
                isNegative={(stats?.totalPnl || 0) < 0}
              />
              <StatCard
                label="Win Rate"
                value={`${(stats?.winRate || 0).toFixed(1)}%`}
                subtitle="Win Ratio"
              />
              <StatCard
                label="Avg Win/Loss"
                value={`$${(stats?.avgWin || 0).toFixed(2)}`}
                subtitle={`Avg Loss: $${(stats?.avgLoss || 0).toFixed(2)}`}
              />
            </div>

            {/* Performance Charts */}
            <div className="mb-8">
              <PerformanceCharts
                plOverTimeData={plOverTimeData}
                tickerPerformanceData={tickerPerformanceData}
                winLossData={winLossData}
              />
            </div>

            {/* By Ticker Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold">By Ticker</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-6 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Ticker</th>
                      <th className="px-6 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Total Trades</th>
                      <th className="px-6 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Open</th>
                      <th className="px-6 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Closed</th>
                      <th className="px-6 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">W/L</th>
                      <th className="px-6 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTicker.map((ticker: any, index: number) => (
                      <tr key={index} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4">{ticker.ticker}</td>
                        <td className="px-6 py-4">{ticker.totalTrades}</td>
                        <td className="px-6 py-4">{ticker.openTrades}</td>
                        <td className="px-6 py-4">{ticker.closedTrades}</td>
                        <td className="px-6 py-4">
                          {ticker.wins}/{ticker.losses} ({((ticker.wins / (ticker.wins + ticker.losses)) * 100 || 0).toFixed(1)}%)
                        </td>
                        <td className={`px-6 py-4 ${ticker.totalPnl < 0 ? 'text-destructive' : 'text-success'}`}>
                          ${ticker.totalPnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold">Webhook Configuration</h2>
                <p className="text-sm text-muted-foreground mt-1">Use the following endpoint in your TradingView alerts:</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">POST URL</label>
                  <div className="bg-secondary border border-border rounded p-3 font-mono text-sm overflow-x-auto">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Payload Format</label>
                  <div className="bg-secondary border border-border rounded p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{`{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "MNQ",
  "price": 150.50,
  "direction": "long",
  "takeProfit": 155.00,
  "stopLoss": 148.00,
  "quantity": 10
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

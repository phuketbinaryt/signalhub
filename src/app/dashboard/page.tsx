'use client';

import { useEffect, useState } from 'react';
import { PerformanceCharts } from '@/components/PerformanceCharts';
import { Button } from '@/components/ui/button';
import { ActionsDropdown } from '@/components/ActionsDropdown';
import { SoundSettings } from '@/components/SoundSettings';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { OpenTradesTable } from '@/components/OpenTradesTable';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';
import { TrendingUp, TrendingDown, Settings, BarChart3, Zap, Target, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
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

  // Handle URL params for strategy filter
  useEffect(() => {
    const strategyParam = searchParams.get('strategy');
    if (strategyParam) {
      setSelectedStrategy(strategyParam);
    }
  }, [searchParams]);

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

  const periods = [
    { value: 'daily', label: 'Session' },
    { value: 'previous_session', label: 'Prev Session' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PWAInstallPrompt />
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0a0a0a]">
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
            <span className="text-sm text-gray-400">State:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
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
              onClick={() => router.push('/strategies')}
              variant="outline"
              className="gap-2 border-[#333] hover:bg-[#1a1a1a]"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Strategies</span>
            </Button>
            <Button
              onClick={() => router.push('/settings')}
              variant="outline"
              className="gap-2 border-[#333] hover:bg-[#1a1a1a]"
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
            <span className="text-sm text-gray-400">Ticker:</span>
            <select
              value={selectedTicker}
              onChange={(e) => {
                setSelectedTicker(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[120px]"
            >
              <option value="all">All Tickers</option>
              {tickers.map((ticker: string) => (
                <option key={ticker} value={ticker}>
                  {ticker}
                </option>
              ))}
            </select>

            <span className="text-sm text-gray-400">Strategy:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => {
                setSelectedStrategy(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 min-w-[120px]"
            >
              <option value="all">All Strategies</option>
              {strategies.map((strategy: string) => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => {
                  setTimePeriod(period.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timePeriod === period.value
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Trades */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Total Trades</div>
                <div className="text-3xl font-bold text-white">{stats?.totalTrades || 0}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats?.openTrades || 0} open / {stats?.closedTrades || 0} closed
                </div>
              </div>
            </div>
          </div>

          {/* Total P&L */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <DollarSign className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Total P&L</div>
                <div className={`text-3xl font-bold ${(stats?.totalPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${(stats?.totalPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-primary">
                <svg width="60" height="30" viewBox="0 0 60 30" className="opacity-50">
                  <path
                    d="M0 25 L10 20 L20 22 L30 15 L40 18 L50 10 L60 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                <div className="text-3xl font-bold text-white">{(stats?.winRate || 0).toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats?.winningTrades || 0}W / {stats?.losingTrades || 0}L
                </div>
              </div>
            </div>
          </div>

          {/* Avg Win/Loss */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Avg Win</div>
                <div className="text-3xl font-bold text-emerald-400">${(stats?.avgWin || 0).toFixed(2)}</div>
                <div className="text-xs text-red-400 mt-1">
                  Avg Loss: -${Math.abs(stats?.avgLoss || 0).toFixed(2)}
                </div>
              </div>
            </div>
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
            <div className="bg-[#111111] border border-[#222] rounded-xl overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-[#222]">
                <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#222]">
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Ticker</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Strategy</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Dir</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Entry</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Exit</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">SL</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">TP</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">P&L</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">P&L %</th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Date</th>
                      <th
                        className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                        onClick={() => handleSort('time')}
                      >
                        Time {sortBy === 'time' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="px-2 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade: any, index: number) => {
                      const tickerColor = getTickerColor(trade.ticker);
                      return (
                      <tr key={index} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
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
                            <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-[#1a1a1a] text-gray-400 border border-[#333] whitespace-nowrap">
                              {trade.strategy}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                            trade.direction === 'short'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {trade.direction === 'short' ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <TrendingUp className="w-3 h-3" />
                            )}
                            {trade.direction === 'short' ? 'SHORT' : 'LONG'}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-sm text-white">{trade.quantity}</td>
                        <td className="px-2 py-3 text-sm text-cyan-400">${trade.entryPrice.toFixed(2)}</td>
                        <td className="px-2 py-3 text-sm text-cyan-400">
                          {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-2 py-3 text-sm text-cyan-400">{trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : '-'}</td>
                        <td className="px-2 py-3 text-sm text-cyan-400">{trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '-'}</td>
                        <td className="px-2 py-3">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-[#1a1a1a] text-gray-400 border border-[#333]">
                            {trade.status.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-2 py-3 text-sm ${(trade.pnl || 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-2 py-3 text-sm ${(trade.pnlPercent || 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {trade.pnlPercent ? `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-400 whitespace-nowrap">
                          {new Date(trade.openedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-400 whitespace-nowrap">
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
                <div className="px-6 py-4 border-t border-[#222] flex items-center justify-between">
                  <div className="text-sm text-gray-500">
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
                      className="border-[#333] hover:bg-[#1a1a1a]"
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
                              {showEllipsis && <span className="px-2 text-gray-600">...</span>}
                              <Button
                                onClick={() => setCurrentPage(page)}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className={currentPage === page ? "bg-primary hover:bg-primary/90" : "border-[#333] hover:bg-[#1a1a1a]"}
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
                      className="border-[#333] hover:bg-[#1a1a1a]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
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
            <div className="bg-[#111111] border border-[#222] rounded-xl overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-[#222]">
                <h2 className="text-lg font-semibold text-white">By Ticker</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#222]">
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Ticker</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Strategies</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Total Trades</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Open</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">Closed</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">W/L</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTicker.map((ticker: any, index: number) => (
                      <tr key={index} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{ticker.ticker}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {ticker.strategies && ticker.strategies.length > 0 ? (
                              ticker.strategies.map((strategy: string) => (
                                <button
                                  key={strategy}
                                  onClick={() => {
                                    setSelectedStrategy(strategy);
                                    setCurrentPage(1);
                                  }}
                                  className="inline-flex px-1.5 py-0.5 rounded text-xs bg-[#1a1a1a] text-gray-400 border border-[#333] whitespace-nowrap hover:bg-[#2a2a2a] hover:text-white transition-colors cursor-pointer"
                                >
                                  {strategy}
                                </button>
                              ))
                            ) : (
                              <span className="text-gray-600 text-sm">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white">{ticker.totalTrades}</td>
                        <td className="px-6 py-4 text-gray-400">{ticker.openTrades}</td>
                        <td className="px-6 py-4 text-gray-400">{ticker.closedTrades}</td>
                        <td className="px-6 py-4">
                          <span className="text-emerald-400">{ticker.wins}</span>
                          <span className="text-gray-600">/</span>
                          <span className="text-red-400">{ticker.losses}</span>
                          <span className="text-gray-500 ml-1">
                            ({((ticker.wins / (ticker.wins + ticker.losses)) * 100 || 0).toFixed(1)}%)
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-medium ${ticker.totalPnl < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          ${ticker.totalPnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-[#111111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#222]">
                <h2 className="text-lg font-semibold text-white">Webhook Configuration</h2>
                <p className="text-sm text-gray-400 mt-1">Use the following endpoint in your TradingView alerts:</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">POST URL</label>
                  <div className="bg-[#1a1a1a] border border-[#333] rounded p-3 font-mono text-sm text-white overflow-x-auto">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Payload Format</label>
                  <div className="bg-[#1a1a1a] border border-[#333] rounded p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-gray-400">{`{
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

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Zap, Target, DollarSign, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface StrategyStats {
  strategy: string;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  tickers: string[];
}

type SortField = 'strategy' | 'totalTrades' | 'winRate' | 'totalPnl' | 'avgWin' | 'maxDrawdown';
type SortDirection = 'asc' | 'desc';

export default function StrategiesPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<StrategyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalPnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchStrategies();
  }, [timePeriod]);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (timePeriod !== 'all') {
        params.append('period', timePeriod);
      }

      const response = await fetch(`/api/strategies?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch strategies');
      }

      const data = await response.json();
      setStrategies(data.strategies);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort strategies
  const filteredAndSortedStrategies = useMemo(() => {
    let result = [...strategies];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.strategy.toLowerCase().includes(query) ||
          s.tickers.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      if (sortField === 'strategy') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
        return sortDirection === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [strategies, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-primary" />
    );
  };

  // Calculate totals
  const totals = strategies.reduce(
    (acc, s) => ({
      totalTrades: acc.totalTrades + s.totalTrades,
      openTrades: acc.openTrades + s.openTrades,
      closedTrades: acc.closedTrades + s.closedTrades,
      wins: acc.wins + s.wins,
      losses: acc.losses + s.losses,
      totalPnl: acc.totalPnl + s.totalPnl,
    }),
    { totalTrades: 0, openTrades: 0, closedTrades: 0, wins: 0, losses: 0, totalPnl: 0 }
  );

  const overallWinRate = totals.closedTrades > 0
    ? (totals.wins / totals.closedTrades) * 100
    : 0;

  // Get performance badge
  const getPerformanceBadge = (strategy: StrategyStats) => {
    if (strategy.winRate >= 70 && strategy.totalPnl > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          High Win Rate
        </span>
      );
    }
    if (strategy.totalPnl < -500) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
          Review Needed
        </span>
      );
    }
    return null;
  };

  const periods = [
    { value: 'partial', label: 'Partial' },
    { value: 'daily', label: 'Session' },
    { value: 'previous_session', label: 'Prev Session' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
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
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button onClick={fetchStrategies} className="bg-primary hover:bg-primary/90">
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Page Title & Period Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-white">Strategy Performance</h1>
          <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setTimePeriod(period.value)}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Strategies */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Total Strategies</div>
                <div className="text-3xl font-bold text-white">{strategies.length}</div>
              </div>
            </div>
          </div>

          {/* Total Trades */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Total Trades</div>
                <div className="text-3xl font-bold text-white">{totals.totalTrades}</div>
              </div>
            </div>
          </div>

          {/* Overall Win Rate */}
          <div className="bg-[#111111] border border-[#222] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-teal-400" />
                </div>
                <div className="text-sm text-gray-400 mb-1">Overall Win Rate</div>
                <div className="text-3xl font-bold text-white">{overallWinRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {totals.wins}W / {totals.losses}L
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
                <div className={`text-3xl font-bold ${totals.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${totals.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search strategies or tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 bg-[#111111] border border-[#222] rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAndSortedStrategies.length === 0 ? (
          <div className="bg-[#111111] border border-[#222] rounded-xl p-12 text-center">
            <p className="text-gray-400">No strategies found.</p>
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#222] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th
                      onClick={() => handleSort('strategy')}
                      className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        Strategy
                        <SortIcon field="strategy" />
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Tickers
                    </th>
                    <th
                      onClick={() => handleSort('totalTrades')}
                      className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        Total
                        <SortIcon field="totalTrades" />
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Open
                    </th>
                    <th className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Closed
                    </th>
                    <th className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      W/L
                    </th>
                    <th
                      onClick={() => handleSort('winRate')}
                      className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        Win Rate
                        <SortIcon field="winRate" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('totalPnl')}
                      className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        P&L
                        <SortIcon field="totalPnl" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('avgWin')}
                      className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        Avg Win
                        <SortIcon field="avgWin" />
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Avg Loss
                    </th>
                    <th
                      onClick={() => handleSort('maxDrawdown')}
                      className="px-4 py-4 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center">
                        Max DD
                        <SortIcon field="maxDrawdown" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedStrategies.map((strategy) => (
                    <tr
                      key={strategy.strategy}
                      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                      onClick={() => {
                        router.push(`/dashboard?strategy=${encodeURIComponent(strategy.strategy)}`);
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <span className="text-white font-medium">{strategy.strategy}</span>
                          {getPerformanceBadge(strategy)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {strategy.tickers.map((ticker) => (
                            <span
                              key={ticker}
                              className="inline-flex px-2 py-0.5 rounded text-xs bg-[#1a1a1a] text-gray-400 border border-[#333]"
                            >
                              {ticker}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-white">{strategy.totalTrades}</td>
                      <td className="px-4 py-4 text-sm text-gray-400">{strategy.openTrades}</td>
                      <td className="px-4 py-4 text-sm text-gray-400">{strategy.closedTrades}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className="text-emerald-400">{strategy.wins}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-red-400">{strategy.losses}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#222] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                strategy.winRate >= 70
                                  ? 'bg-emerald-400'
                                  : strategy.winRate >= 50
                                  ? 'bg-orange-400'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(strategy.winRate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm ${
                            strategy.winRate >= 70
                              ? 'text-emerald-400'
                              : strategy.winRate >= 50
                              ? 'text-orange-400'
                              : 'text-red-400'
                          }`}>
                            {strategy.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${strategy.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${strategy.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${strategy.totalPnl >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        ${strategy.avgWin.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-red-400">
                        -${Math.abs(strategy.avgLoss).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-red-400">
                        -${strategy.maxDrawdown.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#222] text-sm text-gray-500">
              Showing {filteredAndSortedStrategies.length} of {strategies.length} strategies
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

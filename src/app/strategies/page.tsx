'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup } from '@/components/ToggleGroup';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
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

export default function StrategiesPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<StrategyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('all');

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
    ? ((totals.wins / totals.closedTrades) * 100).toFixed(1)
    : '0.0';

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
        {/* Page Title & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">Strategy Performance</h1>
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
              onChange={(value) => setTimePeriod(value)}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Strategies</div>
            <div className="text-2xl font-bold">{strategies.length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="text-2xl font-bold">{totals.totalTrades}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Overall Win Rate</div>
            <div className="text-2xl font-bold">{overallWinRate}%</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={`text-2xl font-bold ${totals.totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${totals.totalPnl.toFixed(2)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : strategies.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No strategies found for the selected period.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Strategy</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Tickers</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Open</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Closed</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">W/L</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Win Rate</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">P&L</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Avg Win</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Avg Loss</th>
                    <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((strategy, index) => (
                    <tr
                      key={strategy.strategy}
                      className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => {
                        router.push(`/dashboard?strategy=${encodeURIComponent(strategy.strategy)}`);
                      }}
                    >
                      <td className="px-4 py-4">
                        <span className="inline-flex px-2 py-1 rounded text-sm font-medium bg-accent/20 text-accent-foreground">
                          {strategy.strategy}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {strategy.tickers.map((ticker) => (
                            <span
                              key={ticker}
                              className="inline-flex px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                            >
                              {ticker}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">{strategy.totalTrades}</td>
                      <td className="px-4 py-4 text-sm">{strategy.openTrades}</td>
                      <td className="px-4 py-4 text-sm">{strategy.closedTrades}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className="text-success">{strategy.wins}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-destructive">{strategy.losses}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          {strategy.winRate >= 50 ? (
                            <TrendingUp className="w-3 h-3 text-success" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          )}
                          <span className={`text-sm ${strategy.winRate >= 50 ? 'text-success' : 'text-destructive'}`}>
                            {strategy.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-4 text-sm font-medium ${strategy.totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${strategy.totalPnl.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-success">
                        ${strategy.avgWin.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-destructive">
                        ${Math.abs(strategy.avgLoss).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-destructive">
                        ${strategy.maxDrawdown.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

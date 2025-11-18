'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatsCard from '@/components/StatsCard';
import TickerSummary from '@/components/TickerSummary';
import TradeTable from '@/components/TradeTable';

interface TradeData {
  trades: any[];
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tradeData, setTradeData] = useState<TradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchTrades();
    }
  }, [session, selectedTicker, statusFilter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedTicker) {
        params.append('ticker', selectedTicker);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

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

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = tradeData?.stats.overall;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Track your TradingView signals and performance
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {selectedTicker && (
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">
              Filtered by: <strong>{selectedTicker}</strong>
            </span>
            <button
              onClick={() => setSelectedTicker(null)}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Clear
            </button>
          </div>
        )}

        <button
          onClick={fetchTrades}
          className="ml-auto bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Trades"
              value={stats?.totalTrades || 0}
              subtitle={`${stats?.openTrades || 0} open, ${stats?.closedTrades || 0} closed`}
            />
            <StatsCard
              title="Total P&L"
              value={`$${stats?.totalPnl?.toFixed(2) || '0.00'}`}
              trend={
                (stats?.totalPnl || 0) > 0
                  ? 'positive'
                  : (stats?.totalPnl || 0) < 0
                  ? 'negative'
                  : 'neutral'
              }
            />
            <StatsCard
              title="Win Rate"
              value={`${stats?.winRate?.toFixed(1) || 0}%`}
              subtitle={`${stats?.winningTrades || 0}W / ${stats?.losingTrades || 0}L`}
              trend={
                (stats?.winRate || 0) >= 50
                  ? 'positive'
                  : (stats?.winRate || 0) > 0
                  ? 'neutral'
                  : 'negative'
              }
            />
            <StatsCard
              title="Avg Win / Loss"
              value={`$${stats?.avgWin?.toFixed(2) || '0.00'}`}
              subtitle={`Avg Loss: $${stats?.avgLoss?.toFixed(2) || '0.00'}`}
            />
          </div>

          {/* Ticker Summary */}
          <div className="mb-8">
            <TickerSummary
              tickerStats={tradeData?.stats.byTicker || []}
              onTickerClick={(ticker) => setSelectedTicker(ticker)}
            />
          </div>

          {/* Trade Table */}
          <div>
            <TradeTable trades={tradeData?.trades || []} />
          </div>
        </>
      )}

      {/* Webhook Info */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Webhook Configuration
        </h3>
        <p className="text-sm text-blue-800 mb-4">
          Use the following endpoint in your TradingView alerts:
        </p>
        <div className="bg-white rounded border border-blue-300 p-3 font-mono text-sm text-gray-800 break-all">
          POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook
        </div>
        <div className="mt-4">
          <p className="text-sm text-blue-800 font-medium mb-2">Payload format:</p>
          <pre className="bg-white rounded border border-blue-300 p-3 text-xs text-gray-800 overflow-x-auto">
{`{
  "secret": "your-webhook-secret",
  "action": "entry",
  "ticker": "AAPL",
  "price": 150.25,
  "direction": "long",
  "takeProfit": 155.00,
  "stopLoss": 148.00,
  "quantity": 10
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}

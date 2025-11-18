interface TickerSummaryProps {
  tickerStats: Array<{
    ticker: string;
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    totalPnl: number;
    wins: number;
    losses: number;
  }>;
  onTickerClick?: (ticker: string) => void;
}

export default function TickerSummary({ tickerStats, onTickerClick }: TickerSummaryProps) {
  if (tickerStats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">By Ticker</h2>
        <p className="text-gray-500 text-center py-8">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold">By Ticker</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Trades
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Open
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Closed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                W/L
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                P&L
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickerStats.map((stat) => {
              const winRate = stat.closedTrades > 0
                ? ((stat.wins / stat.closedTrades) * 100).toFixed(1)
                : '0.0';

              return (
                <tr
                  key={stat.ticker}
                  onClick={() => onTickerClick?.(stat.ticker)}
                  className={onTickerClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stat.ticker}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.totalTrades}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.openTrades}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.closedTrades}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.wins}/{stat.losses} ({winRate}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        stat.totalPnl > 0
                          ? 'text-green-600'
                          : stat.totalPnl < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      ${stat.totalPnl.toFixed(2)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

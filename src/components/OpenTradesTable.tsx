'use client';

interface Trade {
  id: number;
  ticker: string;
  direction: string;
  entryPrice: number;
  strategy: string | null;
  openedAt: string;
  positionSize: number;
}

interface OpenTradesTableProps {
  trades: Trade[];
  getTickerColor: (ticker: string) => string;
}

export function OpenTradesTable({ trades, getTickerColor }: OpenTradesTableProps) {
  // Calculate time open in human-readable format
  const getTimeOpen = (openedAt: string) => {
    const now = new Date();
    const opened = new Date(openedAt);
    const diffMs = now.getTime() - opened.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (trades.length === 0) {
    return null; // Don't show section if no open trades
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <h2 className="text-xl font-semibold">Open Trades</h2>
        <span className="text-sm text-muted-foreground">({trades.length})</span>
      </div>

      <div className="bg-card rounded-lg border-2 border-primary/30 shadow-lg shadow-primary/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ticker</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Direction</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entry</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Position Size</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Strategy</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Time Open</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-4">
                    <span
                      className="px-3 py-1 rounded-md text-sm font-medium"
                      style={{
                        backgroundColor: getTickerColor(trade.ticker) + '20',
                        color: getTickerColor(trade.ticker),
                        border: `1px solid ${getTickerColor(trade.ticker)}40`,
                      }}
                    >
                      {trade.ticker}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.direction === 'long'
                          ? 'bg-success/20 text-success border border-success/30'
                          : 'bg-destructive/20 text-destructive border border-destructive/30'
                      }`}
                    >
                      {trade.direction === 'long' ? '▲ BUY' : '▼ SELL'}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm">
                    ${trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="p-4 text-sm">
                    {trade.positionSize}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {trade.strategy || '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span className="text-sm font-medium text-primary">
                        {getTimeOpen(trade.openedAt)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

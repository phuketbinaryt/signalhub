import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartsProps {
  plOverTimeData: Array<{ date: string; pnl: number }>;
  tickerPerformanceData: Array<{ ticker: string; pnl: number; trades: number }>;
  winLossData: Array<{ name: string; value: number; count: number }>;
}

const COLORS = {
  primary: '#ff6b2c',
  success: '#10b981',
  destructive: '#ef4444',
  muted: '#888888',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={`text-sm font-semibold ${payload[0].value >= 0 ? 'text-success' : 'text-destructive'}`}>
          ${payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{label}</p>
        <p className={`text-sm ${payload[0].value >= 0 ? 'text-success' : 'text-destructive'}`}>
          P&L: ${payload[0].value}
        </p>
        <p className="text-xs text-muted-foreground">
          Trades: {payload[0].payload.trades}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const total = payload[0].payload.total || 14;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} trades ({((payload[0].value / total) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export function PerformanceCharts({ plOverTimeData, tickerPerformanceData, winLossData }: PerformanceChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* P&L Over Time */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">P&L Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={plOverTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              stroke="#888888"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#888888"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="pnl"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={{ fill: COLORS.primary, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance by Ticker */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Performance by Ticker</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tickerPerformanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="ticker"
              stroke="#888888"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#888888"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Bar
              dataKey="pnl"
              fill={COLORS.primary}
              radius={[8, 8, 0, 0]}
            >
              {tickerPerformanceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLORS.success : COLORS.destructive} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Win/Loss Distribution */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Win/Loss Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={winLossData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {winLossData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Wins' ? COLORS.success : COLORS.destructive} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-sm text-muted-foreground">
              Wins ({winLossData.find(d => d.name === 'Wins')?.count || 0})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <span className="text-sm text-muted-foreground">
              Losses ({winLossData.find(d => d.name === 'Losses')?.count || 0})
            </span>
          </div>
        </div>
      </div>

      {/* Trade Volume */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Trade Volume by Ticker</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tickerPerformanceData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              type="number"
              stroke="#888888"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              dataKey="ticker"
              type="category"
              stroke="#888888"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-semibold mb-1">{payload[0].payload.ticker}</p>
                      <p className="text-sm text-muted-foreground">
                        {payload[0].value} trades
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="trades"
              fill={COLORS.primary}
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

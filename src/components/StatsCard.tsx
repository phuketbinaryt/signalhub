interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'positive' | 'negative' | 'neutral';
}

export default function StatsCard({ title, value, subtitle, trend }: StatsCardProps) {
  const getTrendColor = () => {
    if (!trend) return 'text-gray-900';
    switch (trend) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </h3>
      <p className={`mt-2 text-3xl font-semibold ${getTrendColor()}`}>{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
}

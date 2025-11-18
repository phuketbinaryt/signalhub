interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  isNegative?: boolean;
}

export function StatCard({ label, value, subtitle, isNegative }: StatCardProps) {
  const valueColor = isNegative === undefined
    ? 'text-foreground'
    : isNegative
      ? 'text-destructive'
      : 'text-success';

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
      <div className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-3xl font-semibold mb-1 ${valueColor}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-muted-foreground text-sm">
          {subtitle}
        </div>
      )}
    </div>
  );
}

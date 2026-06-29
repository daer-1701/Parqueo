interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

export function StatCard({ label, value, subtext, color = 'blue' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtext && <p className="text-xs mt-1 opacity-70">{subtext}</p>}
    </div>
  );
}

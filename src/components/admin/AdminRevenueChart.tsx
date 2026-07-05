'use client';

import { formatCurrency } from '@/lib/pricing';
import type { ReportPeriodData } from '@/types/database';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AdminRevenueChartProps {
  data: ReportPeriodData[];
  isSingleDay: boolean;
  chartTicksDense: boolean;
}

export function AdminRevenueChart({
  data,
  isSingleDay,
  chartTicksDense,
}: AdminRevenueChartProps) {
  return (
    <div className="w-full h-[220px] sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10 }}
            interval={isSingleDay ? 2 : chartTicksDense ? 2 : 0}
            angle={chartTicksDense ? -35 : 0}
            textAnchor={chartTicksDense ? 'end' : 'middle'}
            height={chartTicksDense ? 50 : 30}
          />
          <YAxis tick={{ fontSize: 10 }} width={40} />
          <Tooltip
            formatter={(value, name) => [
              name === 'revenue' ? formatCurrency(Number(value)) : value,
              name === 'revenue' ? 'Ingresos' : 'Vehículos',
            ]}
          />
          <Bar
            dataKey="revenue"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
            name="revenue"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

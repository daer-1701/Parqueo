'use client';

import { formatCurrency } from '@/lib/pricing';
import type { ReportPeriodData } from '@/types/database';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface RevenueChartPoint extends ReportPeriodData {
  dayStart?: string;
  dayEnd?: string;
}

interface AdminRevenueChartProps {
  data: RevenueChartPoint[];
  isSingleDay: boolean;
  chartTicksDense: boolean;
  selectedDayStart?: string | null;
  onDayClick?: (point: RevenueChartPoint) => void;
}

export function AdminRevenueChart({
  data,
  isSingleDay,
  chartTicksDense,
  selectedDayStart = null,
  onDayClick,
}: AdminRevenueChartProps) {
  const clickable = Boolean(onDayClick) && data.some((point) => point.dayStart);

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
            cursor={clickable ? 'pointer' : undefined}
            onClick={(bar, index) => {
              if (!onDayClick) return;
              const point =
                data[bar.originalDataIndex] ??
                data[index] ??
                (bar.payload as RevenueChartPoint | undefined);
              if (point?.dayStart) onDayClick(point);
            }}
          >
            {data.map((point) => (
              <Cell
                key={point.dayStart ?? point.period}
                fill={
                  point.dayStart && point.dayStart === selectedDayStart
                    ? '#1e3a8a'
                    : '#2563eb'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

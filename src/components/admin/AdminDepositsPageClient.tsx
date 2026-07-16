'use client';

import { AdminDepositsDashboard } from '@/components/admin/AdminDepositsDashboard';
import { AdminDepositsReport } from '@/components/admin/AdminDepositsReport';
import { Banknote, TrendingUp } from 'lucide-react';
import { useState } from 'react';

type DepositsTab = 'report' | 'control';

export function AdminDepositsPageClient() {
  const [tab, setTab] = useState<DepositsTab>('report');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab('report')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
            tab === 'report'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Reporte
        </button>
        <button
          type="button"
          onClick={() => setTab('control')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
            tab === 'control'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Banknote className="w-4 h-4" />
          Control semanal
        </button>
      </div>

      {tab === 'report' ? <AdminDepositsReport /> : <AdminDepositsDashboard />}
    </div>
  );
}

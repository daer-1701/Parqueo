'use client';

import { formatCurrency } from '@/lib/pricing';
import { useWorkerDepositPending } from '@/hooks/useWorkerDepositPending';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'deposit-pending-banner-dismissed';

export function WorkerDepositPendingBanner() {
  const pathname = usePathname();
  const { status } = useWorkerDepositPending();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!status?.hasPending) {
      setDismissed(true);
      return;
    }
    const key = `${DISMISS_KEY}-${status.pendingWeeks.map((w) => w.weekStart).join(',')}`;
    setDismissed(sessionStorage.getItem(key) === '1');
  }, [status]);

  if (!status?.hasPending || dismissed || pathname.startsWith('/worker/deposito')) {
    return null;
  }

  const { currentWeekPending, pastWeeksCount, totalPendingAmount } = status;

  function handleDismiss() {
    const key = `${DISMISS_KEY}-${status!.pendingWeeks.map((w) => w.weekStart).join(',')}`;
    sessionStorage.setItem(key, '1');
    setDismissed(true);
  }

  const message = currentWeekPending
    ? pastWeeksCount > 0
      ? `Tienes ${formatCurrency(totalPendingAmount)} por depositar (${pastWeeksCount + 1} semanas pendientes).`
      : `Tienes ${formatCurrency(currentWeekPending.expectedAmount)} por depositar esta semana.`
    : `Tienes depósitos pendientes de semanas anteriores por ${formatCurrency(totalPendingAmount)}.`;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-medium text-amber-900">Depósito pendiente</p>
          <p className="text-sm text-amber-800 mt-0.5">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/worker/deposito"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
        >
          Ir a depósito
          <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
          aria-label="Ocultar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

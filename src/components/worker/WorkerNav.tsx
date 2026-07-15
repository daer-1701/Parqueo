'use client';

import { useWorkerDepositPending } from '@/hooks/useWorkerDepositPending';
import { formatCurrency } from '@/lib/pricing';
import { CalendarDays, Car, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/worker', label: 'Por horas', icon: Car, showBadge: false },
  { href: '/worker/mensual', label: 'Mensual', icon: CalendarDays, showBadge: false },
  { href: '/worker/deposito', label: 'Depósito', icon: Wallet, showBadge: true },
];

export function WorkerNav() {
  const pathname = usePathname();
  const { status } = useWorkerDepositPending();

  const pendingAmount = status?.totalPendingAmount ?? 0;
  const hasPending = status?.hasPending ?? false;

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex gap-1 sm:gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon, showBadge }) => {
            const active =
              href === '/worker' ? pathname === '/worker' : pathname.startsWith(href);
            const showPendingBadge = showBadge && hasPending;

            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {showPendingBadge && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse"
                    title={`Depósito pendiente: ${formatCurrency(pendingAmount)}`}
                  >
                    !
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

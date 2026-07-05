'use client';

import { CalendarDays, Car } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/worker', label: 'Por horas', icon: Car },
  { href: '/worker/mensual', label: 'Mensual', icon: CalendarDays },
];

export function WorkerNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex gap-1 sm:gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/worker' ? pathname === '/worker' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Banknote, DollarSign, Users } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Reportes', icon: BarChart3 },
  { href: '/admin/depositos', label: 'Depósitos', icon: Banknote },
  { href: '/admin/tarifas', label: 'Tarifas', icon: DollarSign },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4 sm:mb-6">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          href === '/admin'
            ? pathname === '/admin'
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

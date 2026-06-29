'use client';

import { formatBoliviaNow, formatBoliviaTime } from '@/lib/datetime';
import { createClient } from '@/lib/supabase/client';
import { Clock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavbarProps {
  title: string;
  shortTitle?: string;
  userName: string;
  role: string;
}

export function Navbar({ title, shortTitle, userName, role }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [boliviaTime, setBoliviaTime] = useState('');
  const [boliviaTimeShort, setBoliviaTimeShort] = useState('');

  useEffect(() => {
    const update = () => {
      setBoliviaTime(formatBoliviaNow());
      setBoliviaTimeShort(formatBoliviaTime(new Date()));
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 min-h-14 sm:min-h-16 py-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
              <span className="sm:hidden">{shortTitle ?? title}</span>
              <span className="hidden sm:inline">{title}</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 capitalize truncate">{role}</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {boliviaTimeShort && (
              <span className="flex sm:hidden items-center gap-1 text-[11px] text-slate-500 tabular-nums">
                <Clock className="w-3 h-3 shrink-0" />
                {boliviaTimeShort}
              </span>
            )}
            {boliviaTime && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 max-w-[200px] lg:max-w-none">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{boliviaTime}</span>
              </span>
            )}
            <span className="text-xs sm:text-sm text-slate-600 hidden min-[480px]:block max-w-[100px] sm:max-w-[140px] truncate">
              {userName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

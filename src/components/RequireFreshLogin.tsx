'use client';

import {
  clearAppSessionMark,
  hasAppSessionMark,
} from '@/lib/session-gate';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Si el navegador restauró la última página con cookies aún válidas,
 * obliga a pasar por login (sessionStorage se limpia al cerrar el navegador).
 */
export function RequireFreshLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (hasAppSessionMark()) {
        if (!cancelled) setReady(true);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      clearAppSessionMark();
      if (!cancelled) {
        router.replace('/login');
        router.refresh();
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando…</span>
      </div>
    );
  }

  return <>{children}</>;
}

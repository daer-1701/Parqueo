'use client';

import type { WorkerPendingDepositStatus } from '@/lib/worker-deposits';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function useWorkerDepositPending() {
  const pathname = usePathname();
  const [status, setStatus] = useState<WorkerPendingDepositStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/deposits/pending');
      if (!res.ok) return;
      const data = (await res.json()) as WorkerPendingDepositStatus;
      setStatus(data);
    } catch {
      // ignorar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('deposit-pending-refresh', handler);
    return () => window.removeEventListener('deposit-pending-refresh', handler);
  }, [pathname, refresh]);

  return { status, loading, refresh };
}

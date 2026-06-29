import type { UserRole } from '@/types/database';

export type DashboardPath = '/admin' | '/worker' | '/login';

export function getDashboardPath(role: UserRole | null | undefined): DashboardPath {
  if (role === 'admin') return '/admin';
  if (role === 'worker') return '/worker';
  return '/login';
}

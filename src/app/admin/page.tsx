import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getBoliviaLookbackIso } from '@/lib/datetime';
import { createClient } from '@/lib/supabase/server';

/** Solo cargamos los últimos 90 días para no saturar RAM en PCs modestas */
const REPORT_LOOKBACK_DAYS = 90;

export default async function AdminPage() {
  const supabase = await createClient();
  const since = getBoliviaLookbackIso(REPORT_LOOKBACK_DAYS);

  const { data: entries } = await supabase
    .from('parking_entries')
    .select(
      'id, plate, vehicle_type, entry_at, exit_at, amount, status, payment_method, notes, worker_entry_id, worker_exit_id, created_at'
    )
    .eq('status', 'completed')
    .gte('exit_at', since)
    .order('exit_at', { ascending: false })
    .limit(1500);

  return <AdminDashboard entries={entries ?? []} />;
}

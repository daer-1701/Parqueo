import { WorkerDashboard } from '@/components/worker/WorkerDashboard';
import { createClient } from '@/lib/supabase/server';

export default async function WorkerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entries }, { data: pricing }] = await Promise.all([
    supabase
      .from('parking_entries')
      .select(
        'id, plate, vehicle_type, entry_at, exit_at, amount, status, payment_method, notes, worker_entry_id, worker_exit_id, created_at'
      )
      .eq('status', 'active')
      .order('entry_at', { ascending: false }),
    supabase.from('pricing_config').select('id, vehicle_type, first_hour_rate, extra_hour_rate, grace_minutes, updated_at'),
  ]);

  return (
    <WorkerDashboard
      userId={user!.id}
      initialEntries={entries ?? []}
      pricing={pricing ?? []}
    />
  );
}

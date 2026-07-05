import { Navbar } from '@/components/Navbar';
import { WorkerDashboard } from '@/components/worker/WorkerDashboard';
import { getDashboardPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function WorkerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'worker') {
    redirect(getDashboardPath(profile?.role));
  }

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
    <div className="min-h-screen bg-slate-50">
      <Navbar
        title="Panel de Operador"
        shortTitle="Operador"
        userName={profile.full_name}
        role="Operador"
      />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-safe">
        <WorkerDashboard
          userId={user.id}
          userName={profile.full_name}
          initialEntries={entries ?? []}
          pricing={pricing ?? []}
        />
      </main>
    </div>
  );
}

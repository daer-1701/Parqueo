import { MonthlyParkingDashboard } from '@/components/worker/MonthlyParkingDashboard';
import { todayDateString } from '@/lib/monthly-parking';
import { createClient } from '@/lib/supabase/server';

export default async function WorkerMonthlyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayDateString();

  const [{ data: subscriptions }, { data: pricing }] = await Promise.all([
    supabase
      .from('monthly_parking')
      .select(
        'id, plate, vehicle_type, monthly_amount, period_start, period_end, status, customer_name, notes, worker_id, paid_at, payment_method, created_at'
      )
      .eq('status', 'active')
      .gte('period_end', today)
      .order('period_end', { ascending: true }),
    supabase.from('pricing_config').select('vehicle_type, monthly_rate'),
  ]);

  return (
    <MonthlyParkingDashboard
      userId={user!.id}
      initialSubscriptions={subscriptions ?? []}
      monthlyRates={pricing ?? []}
    />
  );
}

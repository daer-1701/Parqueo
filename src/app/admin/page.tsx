import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('parking_entries')
    .select('*')
    .eq('status', 'completed')
    .order('exit_at', { ascending: false });

  return <AdminDashboard entries={entries ?? []} />;
}

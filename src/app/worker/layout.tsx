import { Navbar } from '@/components/Navbar';
import { PrintAgentPanel } from '@/components/PrintAgentPanel';
import { RequireFreshLogin } from '@/components/RequireFreshLogin';
import { WorkerDepositPendingBanner } from '@/components/worker/WorkerDepositPendingBanner';
import { WorkerNav } from '@/components/worker/WorkerNav';
import { getDashboardPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <RequireFreshLogin>
      <div className="min-h-screen bg-slate-50">
        <Navbar
          title="Panel de Operador"
          shortTitle="Operador"
          userName={profile.full_name}
          role="Operador"
        />
        <WorkerNav />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-safe">
          <PrintAgentPanel />
          <WorkerDepositPendingBanner />
          {children}
        </main>
      </div>
    </RequireFreshLogin>
  );
}

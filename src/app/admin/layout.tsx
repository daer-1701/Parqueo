import { AdminNav } from '@/components/admin/AdminNav';
import { Navbar } from '@/components/Navbar';
import { getDashboardPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
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
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect(getDashboardPath(profile?.role));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        title="Panel de Administración"
        shortTitle="Admin"
        userName={profile.full_name}
        role="Administrador"
      />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-safe">
        <AdminNav />
        {children}
      </main>
    </div>
  );
}

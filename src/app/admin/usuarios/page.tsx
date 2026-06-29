import { UserManagement } from '@/components/admin/UserManagement';
import { createClient } from '@/lib/supabase/server';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <UserManagement currentUserId={user!.id} />;
}

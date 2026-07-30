import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Ban largo (~100 años) para que Auth rechace signIn directo. */
const BAN_DURATION = '876000h';

export async function lockAuthUser(admin: AdminClient, userId: string): Promise<void> {
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: BAN_DURATION,
  });
}

export async function unlockAuthUser(admin: AdminClient, userId: string): Promise<void> {
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });
}

export async function setProfileLocked(
  admin: AdminClient,
  userId: string,
  locked: boolean,
  failedAttempts = 0
): Promise<void> {
  await admin
    .from('profiles')
    .update({
      is_locked: locked,
      failed_login_attempts: locked ? failedAttempts : 0,
      locked_at: locked ? new Date().toISOString() : null,
    })
    .eq('id', userId);

  if (locked) {
    await lockAuthUser(admin, userId);
  } else {
    await unlockAuthUser(admin, userId);
  }
}

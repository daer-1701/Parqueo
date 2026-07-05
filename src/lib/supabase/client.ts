import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { assertSupabaseEnv } from './env';

let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    const { url, key } = assertSupabaseEnv();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}

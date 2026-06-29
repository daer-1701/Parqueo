import { PricingManagement } from '@/components/admin/PricingManagement';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPricingPage() {
  const supabase = await createClient();

  const { data: pricing } = await supabase
    .from('pricing_config')
    .select('*')
    .order('vehicle_type');

  return <PricingManagement initialPricing={pricing ?? []} />;
}

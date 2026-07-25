import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { ComprehensiveAnalytics, TimePeriod } from '../types/analytics.types';

export async function getAnalytics(period: TimePeriod): Promise<ComprehensiveAnalytics> {
  const clinicId = useAuthStore.getState().user?.clinicId;
  if (!clinicId) throw new Error('No clinic associated with the current user.');

  const { data, error } = await supabase.rpc('get_analytics', { p_clinic_id: clinicId, p_period: period });
  if (error || !data) throw new Error(error?.message || 'Failed to load analytics.');
  return data as ComprehensiveAnalytics;
}

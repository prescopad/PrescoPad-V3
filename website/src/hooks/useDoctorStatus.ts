import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';
import { useIsAssistant } from '../store/useAuthStore';
import { APP_CONFIG } from '../constants/config';

interface DoctorStatus {
  id: string;
  name: string;
  isOnline: boolean;
}

// Mirrors frontend/src/screens/assistant/AssistantDashboard.tsx: assistants
// poll their clinic's doctor online-status every 30s off the same heartbeat
// the doctor's own client is sending.
export function useDoctorStatus(): DoctorStatus[] {
  const isAssistant = useIsAssistant();
  const [doctors, setDoctors] = useState<DoctorStatus[]>([]);

  useEffect(() => {
    if (!isAssistant) return;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('get_doctor_status');
        if (error) throw error;
        const raw = (data ?? []) as Record<string, unknown>[];
        setDoctors(raw.map((d) => ({
          id: d.id as string,
          name: (d.name as string) ?? '',
          isOnline: Boolean(d.is_online),
        })));
      } catch {
        // keep existing
      }
    };

    load();
    const interval = setInterval(load, APP_CONFIG.polling.doctorStatusIntervalMs);

    const channel = supabase
      .channel('presence_status_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence' },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAssistant]);

  return doctors;
}

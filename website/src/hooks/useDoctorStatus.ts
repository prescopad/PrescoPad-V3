import { useEffect, useState } from 'react';
import api from '../api/client';
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
        const res = await api.get('/clinic/doctor-status');
        const raw = (res.data.doctors ?? []) as Record<string, unknown>[];
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
    return () => clearInterval(interval);
  }, [isAssistant]);

  return doctors;
}

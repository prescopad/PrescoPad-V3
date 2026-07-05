import { useEffect } from 'react';
import { heartbeat } from '../api/authService';
import { useIsDoctor } from '../store/useAuthStore';
import { APP_CONFIG } from '../constants/config';

// Mirrors frontend/src/navigation/DoctorTabNavigator.tsx: pings the backend
// every 60s while a doctor is signed in, powering the assistant's "doctor
// online" indicator. Pauses/resumes on tab visibility, same intent as
// mobile's AppState foreground/background handling.
export function useDoctorHeartbeat() {
  const isDoctor = useIsDoctor();

  useEffect(() => {
    if (!isDoctor) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const send = () => heartbeat().catch(() => {});

    const start = () => {
      if (intervalId) return;
      send();
      intervalId = setInterval(send, APP_CONFIG.polling.presenceIntervalMs);
    };

    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isDoctor]);
}

import { useEffect, useState } from 'react';
import type { Backend, Session } from '../domain/models';

/** Live session from the backend (loading / unpaired / waiting / paired / error). */
export function useSession(backend: Backend | null, retryKey = 0): Session {
  const [session, setSession] = useState<Session>({ kind: 'loading' });

  useEffect(() => {
    if (!backend) return;
    setSession({ kind: 'loading' });
    return backend.subscribe(setSession);
  }, [backend, retryKey]);

  return session;
}

import type { Backend } from '../domain/models';
import { isFirebaseConfigured, useDevBackend } from './config';

/** The one backend instance for the app, or null when Firebase has not been configured yet. */
export function createBackend(): Backend | null {
  if (useDevBackend) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DevBackend } = require('./devBackend') as typeof import('./devBackend');
    return new DevBackend();
  }
  if (!isFirebaseConfigured) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FirebaseBackend } = require('./firebase') as typeof import('./firebase');
  return new FirebaseBackend();
}

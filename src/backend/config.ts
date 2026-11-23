/**
 * Firebase web-app config. These values are NOT secrets (they ship in every app); access is
 * enforced by firestore.rules. Paste yours from:
 *   Firebase console > Project settings > Your apps > Web app (</>) > SDK setup and configuration.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyCIcBU3EOqow64k6izx88HNQKLgqefgjGw',
  authDomain: 'togethr-6704e.firebaseapp.com',
  projectId: 'togethr-6704e',
  storageBucket: 'togethr-6704e.firebasestorage.app',
  messagingSenderId: '459903727821',
  appId: '1:459903727821:web:b2494d36c1f139f75e5184',
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((v) => v.includes('PASTE_'));

/** Test-only: two browser tabs act as two phones through localStorage. Never set in a shipped build. */
export const useDevBackend = process.env.EXPO_PUBLIC_DEV_BACKEND === '1';

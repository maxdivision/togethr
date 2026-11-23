# DUO (Expo, real two-phone version)

No demo data. Two phones pair with a 6-digit code, set their own habits, and sync through Firebase.

## Firebase setup (once)
1. Firebase console: create a project; Build > Authentication > Sign-in method > enable **Anonymous**.
2. Build > Firestore Database > create (production mode), then paste `firestore.rules` into Rules and publish.
3. Project settings > Your apps > add a **Web** app and copy its config into `src/backend/config.ts`.

## Run / build
- `npm install && npx expo start` (Expo Go on both phones), or
- APK: `eas build -p android --profile preview` (profile in `eas.json`).

## Checks
- `npx tsc --noEmit`, `npx tsx scripts/streak.test.ts` (11 tests).
- Web smoke test of the full flow with `EXPO_PUBLIC_DEV_BACKEND=1` (two tabs = two phones). Never set it in a shipped build.

## Not verified
Real Firebase sync between two devices, haptics, native blur, background push (pulses only show while the app is open).

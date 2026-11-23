import { useFonts } from 'expo-font';
// Per-weight imports: the package index would bundle every weight (~60 files) into the app.
import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond/300Light';
import { CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond/400Regular_Italic';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { Jost_300Light } from '@expo-google-fonts/jost/300Light';
import { Jost_400Regular } from '@expo-google-fonts/jost/400Regular';
import { Jost_500Medium } from '@expo-google-fonts/jost/500Medium';

/** Returns true once the editorial serif + geometric sans are ready (or failed: we fall back to system). */
export function useDuoFonts(): boolean {
  const [loaded, error] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
  });
  return loaded || !!error;
}

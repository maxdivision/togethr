import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createBackend } from './src/backend';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { MessageScreen, PairingScreen, WaitingScreen } from './src/screens/SetupScreens';
import { useSession } from './src/state/useSession';
import { useDuoFonts } from './src/theme/fonts';
import { colors } from './src/theme/tokens';

function Root() {
  const backend = useMemo(() => createBackend(), []);
  const [retry, setRetry] = useState(0);
  const session = useSession(backend, retry);

  if (!backend) {
    return (
      <MessageScreen
        title="Setup required"
        body="Firebase is not configured. Paste your web config into src/backend/config.ts and rebuild."
      />
    );
  }
  switch (session.kind) {
    case 'loading':
      return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
    case 'error':
      return (
        <MessageScreen
          title="Cannot connect"
          body={session.message}
          action={{ label: 'Try again', onPress: () => setRetry((n) => n + 1) }}
        />
      );
    case 'unpaired':
      return <PairingScreen backend={backend} />;
    case 'waiting':
      return <WaitingScreen code={session.code} name={session.me.name} onCancel={() => backend.leavePair()} />;
    case 'paired':
      return <DashboardScreen pair={session.pair} backend={backend} />;
  }
}

export default function App() {
  const ready = useDuoFonts();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        <Root />
      </View>
    </SafeAreaProvider>
  );
}

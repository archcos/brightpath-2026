import Constants from 'expo-constants';
import { Alert, Platform, Switch } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useSettings, type Settings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, update, reset } = useSettings();

  const confirmReset = () => {
    if (Platform.OS === 'web') return reset();
    Alert.alert('Reset settings?', 'Theme and accessibility options return to their defaults.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);
  };

  return (
    <Screen>
      <Card>
        <ThemedText type="label" themeColor="textSecondary">
          Appearance
        </ThemedText>
        <ThemedText type="smallBold">Theme</ThemedText>
        <Chips<Settings['theme']>
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={settings.theme}
          onChange={(v) => update({ theme: v })}
        />
      </Card>

      <Card>
        <ThemedText type="label" themeColor="textSecondary">
          Accessibility
        </ThemedText>
        <ThemedText type="smallBold">Text Size</ThemedText>
        <Chips<Settings['textSize']>
          options={[
            { value: 'small', label: 'Small' },
            { value: 'default', label: 'Default' },
            { value: 'large', label: 'Large' },
          ]}
          value={settings.textSize}
          onChange={(v) => update({ textSize: v })}
        />
        <ListRow
          title="High Contrast"
          right={
            <Switch
              value={settings.highContrast}
              onValueChange={(v) => update({ highContrast: v })}
              trackColor={{ true: theme.primary }}
              accessibilityLabel="High Contrast"
            />
          }
        />
        <ListRow
          title="Reduce Animations"
          right={
            <Switch
              value={settings.reduceMotion}
              onValueChange={(v) => update({ reduceMotion: v })}
              trackColor={{ true: theme.primary }}
              accessibilityLabel="Reduce Animations"
            />
          }
        />
      </Card>

      <Card>
        <ThemedText type="label" themeColor="textSecondary">
          About
        </ThemedText>
        <ListRow title="About BrightPath" subtitle="Learn today. Be ready for tomorrow." />
        <ListRow title="Version" right={<ThemedText type="small">{Constants.expoConfig?.version ?? '1.0.0'}</ThemedText>} />
      </Card>

      <Button variant="danger" label="Reset Settings" onPress={confirmReset} />
    </Screen>
  );
}

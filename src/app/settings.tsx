import Constants from 'expo-constants';
import { Switch } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/context/auth-context';
import { useSettings, type Settings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/utils/confirm';
import { ROLE_LABEL } from '@/utils/roles';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { settings, update, reset } = useSettings();

  const confirmReset = async () => {
    if (await confirmDestructive('Reset settings?', 'Theme and accessibility options return to their defaults.', 'Reset')) {
      reset();
    }
  };

  const confirmSignOut = async () => {
    if (await confirmDestructive('Sign out?', 'You will need your password to sign back in.', 'Sign out')) await signOut();
  };

  return (
    <Screen>
      {user && (
        <Card>
          <ThemedText type="label" themeColor="textSecondary">
            Account
          </ThemedText>
          <ListRow
            icon={user.avatar}
            title={user.displayName}
            subtitle={`@${user.username} • ${user.email}\n${ROLE_LABEL[user.role]}${user.school ? ` • ${user.school.name}` : ''}`}
          />
          <Button small variant="ghost" label="Sign out of this device" onPress={confirmSignOut} />
        </Card>
      )}

      <Card>
        <ThemedText type="label" themeColor="textSecondary">
          Appearance
        </ThemedText>
        <ThemedText type="smallBold">Theme</ThemedText>
        <Segmented<Settings['theme']>
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
        <Segmented<Settings['textSize']>
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

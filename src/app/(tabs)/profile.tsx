import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { useChildProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/utils/confirm';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user: parent, children, signOut } = useAuth();
  const { child, selectChild } = useChild();
  const { data: profile } = useChildProfile();

  const confirmSignOut = async () => {
    if (await confirmDestructive('Sign out?', 'You will need your password to sign back in.', 'Sign out')) await signOut();
  };

  const menu: { icon: string; title: string; subtitle?: string; href: Href }[] = [
    { icon: '📊', title: 'Weekly Summary', subtitle: `${child?.firstName ?? 'Your child'}'s week`, href: '/weekly' },
    { icon: '🔔', title: 'Notifications', subtitle: 'Parent updates & alerts', href: '/notification-settings' },
    { icon: '🧒', title: 'Student Mode', subtitle: 'Hand the phone to your child', href: '/student' },
    { icon: '🔖', title: 'Saved lessons & words', href: '/saved' },
    { icon: '⚙️', title: 'Settings', href: '/settings' },
  ];

  return (
    <Screen tab>
      <View style={styles.parent}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={styles.avatar}>{parent?.avatar}</ThemedText>
        </View>
        <ThemedText type="title">{parent?.displayName}</ThemedText>
        <ThemedText themeColor="textSecondary">@{parent?.username}</ThemedText>
        <Badge
          label={`Parent / Guardian • ${children.length} ${children.length === 1 ? 'child' : 'children'}`}
          tone="primary"
        />
      </View>

      <View style={styles.gap}>
        <ThemedText type="label" themeColor="textSecondary">
          My Children
        </ThemedText>
        {children.map((c) => (
          <Card key={c.id} style={styles.childRow}>
            <ThemedText style={styles.childAvatar}>{c.avatar}</ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {c.firstName} {c.lastName}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Grade {c.grade} • Section {c.section}
              </ThemedText>
            </View>
            {c.id === child?.id ? (
              <Badge label="Viewing" tone="primary" />
            ) : (
              <Button small variant="secondary" label="Switch" onPress={() => selectChild(c.id)} />
            )}
          </Card>
        ))}
        <Button variant="secondary" label="+ Connect Another Child" onPress={() => router.push('/connect-child')} />
      </View>

      {profile && (
        <Card>
          <ThemedText type="label" themeColor="textSecondary">
            Child Profile
          </ThemedText>
          <ThemedText type="heading">
            {profile.avatar} {profile.firstName} {profile.lastName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Grade {profile.grade} • Section {profile.section}
          </ThemedText>
          <ThemedText type="small">{profile.school}</ThemedText>
          <View style={styles.facts}>
            <Fact label="Class Adviser" value={profile.adviser ?? '—'} />
            <Fact label="Student Code" value={profile.studentCode} />
          </View>
          <ThemedText type="label" themeColor="textSecondary">
            Subjects
          </ThemedText>
          <View style={styles.wrap}>
            {profile.subjects.map((s) => (
              <Badge key={s.code} label={s.name} tone="neutral" />
            ))}
          </View>
        </Card>
      )}

      <Card>
        {menu.map((m) => (
          <ListRow
            key={m.title}
            icon={m.icon}
            title={m.title}
            subtitle={m.subtitle}
            onPress={() => router.push(m.href)}
          />
        ))}
      </Card>

      <Button variant="danger" label="Sign out" onPress={confirmSignOut} />
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.flex}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  parent: { alignItems: 'center', gap: Spacing.one },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatar: { fontSize: 52, lineHeight: 64 },
  gap: { gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.half },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  childAvatar: { fontSize: 28, lineHeight: 36 },
  facts: { flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

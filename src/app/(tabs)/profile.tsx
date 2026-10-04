import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { useChildProfile } from '@/hooks/queries';
import { formatTime } from '@/utils/format';

export default function ProfileScreen() {
  const { user: parent, children, signOut } = useAuth();
  const { child, selectChild } = useChild();
  const { data: profile } = useChildProfile();

  const menu: { icon: string; title: string; subtitle?: string; href: Href; right?: string }[] = [
    { icon: '📊', title: 'Weekly Summary', subtitle: `${child?.firstName ?? 'Your child'}'s week`, href: '/weekly' },
    { icon: '🔔', title: 'Notifications', subtitle: 'Parent updates & alerts', href: '/notification-settings' },
    { icon: '🧒', title: 'Student Mode', subtitle: 'Hand the phone to your child', href: '/student' },
    { icon: '🔖', title: 'Saved lessons & words', href: '/saved' },
    { icon: '🎙️', title: 'Teacher Pendant', href: '/pendant', right: profile?.pendant?.online ? 'Connected' : undefined },
    { icon: '⚙️', title: 'Settings', href: '/settings' },
  ];

  return (
    <Screen tab>
      <View style={styles.parent}>
        <ThemedText style={styles.avatar}>{parent?.avatar}</ThemedText>
        <ThemedText type="title">{parent?.displayName}</ThemedText>
        <ThemedText themeColor="textSecondary">
          Parent / Guardian • {children.length} {children.length === 1 ? 'child' : 'children'} connected
        </ThemedText>
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
          {profile.pendant && (
            <Pressable onPress={() => router.push('/pendant')} accessibilityRole="button">
              <ThemedText type="caption" themeColor="primary">
                🎙️ Teacher Pendant {profile.pendant.code} • last synced {formatTime(profile.pendant.lastSyncAt)}
              </ThemedText>
            </Pressable>
          )}
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
            right={m.right ? <Badge label={m.right} tone="success" /> : undefined}
          />
        ))}
      </Card>

      <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        BrightPath only shows children connected to your account. You can view lessons, assignments, activities and
        calendar entries — but never change what a teacher recorded.
      </ThemedText>
      <Button variant="danger" label="Sign out" onPress={signOut} />
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
  avatar: { fontSize: 56, lineHeight: 68 },
  gap: { gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.half },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  childAvatar: { fontSize: 28, lineHeight: 36 },
  facts: { flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

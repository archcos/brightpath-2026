import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import type { Subject } from '@/types/api';

const EMOJI: Record<string, string> = {
  Mathematics: '🔢',
  Science: '🔬',
  English: '📖',
  Filipino: '🗣️',
  'Araling Panlipunan': '🗺️',
  MAPEH: '🎨',
  GMRC: '💛',
};

export function SubjectIcon({ subject, size = 40 }: { subject: Subject; size?: number }) {
  return (
    <View
      style={[styles.icon, { width: size, height: size, backgroundColor: `${subject.color}22` }]}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <ThemedText style={{ fontSize: size * 0.45, lineHeight: size * 0.6 }}>{EMOJI[subject.name] ?? '📚'}</ThemedText>
    </View>
  );
}

export function SubjectLabel({ subject }: { subject: Subject }) {
  return (
    <ThemedText type="caption" style={{ color: subject.color, fontWeight: 700 }}>
      {subject.name}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  icon: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});

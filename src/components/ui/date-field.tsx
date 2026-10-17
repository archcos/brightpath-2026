import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Popup } from '@/components/ui/popup';
import { Segmented } from '@/components/ui/segmented';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isoDay, monthWeeks, to12Hour, to24Hour } from '@/utils/calendar';
import { formatTime, parseDate, toISODate } from '@/utils/format';

export type DateFieldProps = {
  label: string;
  mode: 'date' | 'time';
  /** "YYYY-MM-DD" (date) or "HH:MM" (time); '' when nothing is picked yet. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Earliest / latest selectable day, "YYYY-MM-DD" (date mode). */
  min?: string;
  max?: string;
  /** Read-only: shows the value without opening the picker. */
  disabled?: boolean;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

/** "Fri, Oct 17, 2026" or "9:30 AM". */
export const formatFieldValue = (mode: DateFieldProps['mode'], value: string) =>
  mode === 'date'
    ? parseDate(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : formatTime(`2000-01-01 ${value}`);

/**
 * A date or time picked from an in-app calendar / clock (same look on Android, iOS and web, in the
 * app's theme), never typed, so it is always a real date or time.
 */
export function DateField({ label, mode, value, onChange, placeholder, min, max, disabled }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const shown = value ? formatFieldValue(mode, value) : (placeholder ?? (mode === 'date' ? 'Pick a date' : 'Pick a time'));
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        accessibilityHint={disabled ? undefined : `Opens a ${mode === 'date' ? 'calendar' : 'time picker'}`}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: disabled ? 'transparent' : theme.backgroundElement, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.flex} themeColor={value ? 'text' : 'textSecondary'} numberOfLines={1}>
          {shown}
        </ThemedText>
        {!disabled && <ThemedText themeColor="textSecondary">{mode === 'date' ? '📅' : '🕘'}</ThemedText>}
      </Pressable>

      {/* Mounted only while open, so each opening starts from the current value. */}
      {open &&
        (mode === 'date' ? (
          <Calendar label={label} value={value} min={min} max={max} onPick={pick} onClose={() => setOpen(false)} />
        ) : (
          <Clock label={label} value={value} onPick={pick} onClose={() => setOpen(false)} />
        ))}
    </View>
  );
}

type PickerProps = { label: string; value: string; onPick: (value: string) => void; onClose: () => void };

function Calendar({ label, value, min, max, onPick, onClose }: PickerProps & { min?: string; max?: string }) {
  const theme = useTheme();
  const today = toISODate(new Date());
  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const start = parseDate(value || (min && today < min ? min : max && today > max ? max : today));
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const [pickingYear, setPickingYear] = useState(false);

  const lastDay = new Date(year, month + 1, 0).getDate();
  const canPrev = !min || isoDay(year, month, 1) > min;
  const canNext = !max || isoDay(year, month, lastDay) < max;
  const step = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  // Years to jump to: the allowed range, or a few years either side of today.
  const thisYear = new Date().getFullYear();
  const firstYear = min ? Number(min.slice(0, 4)) : Math.min(thisYear - 5, year);
  const lastYear = max ? Number(max.slice(0, 4)) : Math.max(thisYear + 5, year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i);

  return (
    <Popup visible onClose={onClose} closeLabel="Close calendar">
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.monthBar}>
        <NavButton label="Previous month" glyph="‹" disabled={!canPrev || pickingYear} onPress={() => step(-1)} />
        <Pressable
          onPress={() => setPickingYear((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={`${MONTHS[month]} ${year}, choose a year`}
          style={({ pressed }) => [styles.monthTitle, pressed && styles.pressed]}>
          <ThemedText type="heading">
            {MONTHS[month]} {year} {pickingYear ? '▴' : '▾'}
          </ThemedText>
        </Pressable>
        <NavButton label="Next month" glyph="›" disabled={!canNext || pickingYear} onPress={() => step(1)} />
      </View>

      {pickingYear ? (
        <ScrollView style={styles.years} contentContainerStyle={styles.chips}>
          {years.map((y) => (
            <Chip
              key={y}
              label={String(y)}
              selected={y === year}
              onPress={() => {
                setYear(y);
                // Keep the month inside the allowed range for that year.
                if (min && isoDay(y, month, 31) < min) setMonth(Number(min.slice(5, 7)) - 1);
                if (max && isoDay(y, month, 1) > max) setMonth(Number(max.slice(5, 7)) - 1);
                setPickingYear(false);
              }}
            />
          ))}
        </ScrollView>
      ) : (
        <View>
          <View style={styles.week}>
            {WEEKDAYS.map((d) => (
              <ThemedText key={d} type="caption" themeColor="textSecondary" style={styles.weekday}>
                {d.slice(0, 2)}
              </ThemedText>
            ))}
          </View>
          {monthWeeks(year, month).map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((day, i) => {
                if (!day) return <View key={i} style={styles.day} />;
                const iso = isoDay(year, month, day);
                const selected = iso === value;
                const off = outOfRange(iso);
                return (
                  <View key={i} style={styles.day}>
                    <Pressable
                      onPress={() => onPick(iso)}
                      disabled={off}
                      accessibilityRole="button"
                      accessibilityLabel={formatFieldValue('date', iso)}
                      accessibilityState={{ selected, disabled: off }}
                      style={({ pressed }) => [
                        styles.dayButton,
                        selected && { backgroundColor: theme.primary },
                        !selected && iso === today && { borderWidth: 1, borderColor: theme.primary },
                        pressed && !selected && { backgroundColor: theme.primarySoft },
                      ]}>
                      <ThemedText
                        type={selected ? 'smallBold' : 'small'}
                        style={{ color: selected ? theme.onPrimary : off ? theme.border : theme.text }}>
                        {day}
                      </ThemedText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
        </View>
        {!outOfRange(today) && (
          <View style={styles.flex}>
            <Button variant="ghost" label="Today" onPress={() => onPick(today)} />
          </View>
        )}
      </View>
    </Popup>
  );
}

function Clock({ label, value, onPick, onClose }: PickerProps) {
  const initial = to12Hour(value || '09:00');
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [pm, setPm] = useState(initial.pm);
  // 5-minute steps, plus the current minute if it's an odd one (e.g. 09:07 from a recording).
  const minutes = [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), initial.minute])].sort((a, b) => a - b);

  return (
    <Popup visible onClose={onClose} closeLabel="Close time picker">
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="title" style={styles.center}>
        {formatTime(`2000-01-01 ${to24Hour(hour, minute, pm)}`)}
      </ThemedText>
      <ThemedText type="smallBold">Hour</ThemedText>
      <View style={styles.chips}>
        {HOURS.map((h) => (
          <Chip key={h} label={String(h)} selected={h === hour} onPress={() => setHour(h)} />
        ))}
      </View>
      <ThemedText type="smallBold">Minute</ThemedText>
      <View style={styles.chips}>
        {minutes.map((m) => (
          <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={m === minute} onPress={() => setMinute(m)} />
        ))}
      </View>
      <Segmented
        options={[
          { value: 'am', label: 'AM' },
          { value: 'pm', label: 'PM' },
        ]}
        value={pm ? 'pm' : 'am'}
        onChange={(v) => setPm(v === 'pm')}
      />
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button variant="secondary" label="Cancel" onPress={onClose} />
        </View>
        <View style={styles.flex}>
          <Button label="Set time" onPress={() => onPick(to24Hour(hour, minute, pm))} />
        </View>
      </View>
    </Popup>
  );
}

function NavButton({ label, glyph, disabled, onPress }: { label: string; glyph: string; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [styles.nav, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <ThemedText type="heading" style={{ color: disabled ? theme.border : theme.primary }}>
        {glyph}
      </ThemedText>
    </Pressable>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.backgroundElement },
        pressed && !selected && { backgroundColor: theme.primarySoft },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  monthTitle: { flex: 1, alignItems: 'center', paddingVertical: Spacing.one },
  nav: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: Spacing.one },
  // Each day is a 40pt circle centred in an equal-width column (44pt rows keep the touch target).
  day: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  years: { maxHeight: 280 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minWidth: 56, minHeight: 44, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
});

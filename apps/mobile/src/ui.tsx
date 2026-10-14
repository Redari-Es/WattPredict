import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from './theme';

/** 卡片容器 */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function CardDesc({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardDesc}>{children}</Text>;
}

/** 表单字段标签 */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** 费用构成堆叠条 */
export function SegmentedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;
  return (
    <View style={styles.segBar}>
      {segments.map((s) => (
        <View
          key={s.label}
          style={{ flex: s.value / total, backgroundColor: s.color }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  cardDesc: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  fieldLabel: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  segBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
});

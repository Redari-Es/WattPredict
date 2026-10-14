import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { engine } from '../../src/engine';
import { useAppStore } from '../../src/store';
import {
  appliancePresets, CATEGORY_LABELS, type ApplianceCategory,
} from '../../src/presets';
import { formatEnergy, formatPower, monthlyEnergyKwh } from '../../src/format';
import { Card } from '../../src/ui';
import { colors } from '../../src/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function AppliancesScreen() {
  const router = useRouter();
  const { appliances, setAppliance, meterType, startSimulation } = useAppStore();
  const [category, setCategory] = useState<ApplianceCategory | 'all'>('all');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const estimateTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const totalKwh = useMemo(
    () =>
      Object.entries(appliances).reduce((sum, [id, a]) => {
        const preset = appliancePresets.find((p) => p.id === id);
        const powerW = a.powerW ?? preset?.power_w;
        return powerW ? sum + monthlyEnergyKwh(powerW, a.hoursPerDay) * a.count : sum;
      }, 0),
    [appliances],
  );

  // 总量变化 → 防抖调用瓦特引擎估价
  useEffect(() => {
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    if (totalKwh <= 0) {
      setEstimate(null);
      return;
    }
    estimateTimer.current = setTimeout(async () => {
      setEstimating(true);
      try {
        const res = await engine.simulate({
          province: 'GD', meter_type: meterType,
          monthly_kwh: Math.round(totalKwh * 10) / 10,
          has_tou: false, month: new Date().getMonth() + 1,
        });
        setEstimate(res.total_cost);
      } catch {
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    }, 800);
    return () => {
      if (estimateTimer.current) clearTimeout(estimateTimer.current);
    };
  }, [totalKwh, meterType]);

  const visible = category === 'all'
    ? appliancePresets
    : appliancePresets.filter((p) => p.category === category);

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 汇总 */}
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.muted}>已选电器 · 按 30 天/月估算</Text>
              <Text style={styles.totalKwh}>{formatEnergy(totalKwh)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.muted}>瓦特引擎估价</Text>
              <Text style={styles.estimate}>
                {estimating ? '…' : estimate != null ? `¥${estimate.toFixed(2)}` : '—'}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.bringBtn, totalKwh <= 0 && { opacity: 0.4 }]}
            disabled={totalKwh <= 0}
            onPress={() => {
              startSimulation(Math.round(totalKwh * 10) / 10);
              router.push('/simulate');
            }}
          >
            <MaterialCommunityIcons name="calculator-variant-outline" size={16} color={colors.primary} />
            <Text style={styles.bringBtnText}>带入推演（{formatEnergy(totalKwh)}）</Text>
          </Pressable>
        </Card>

        {/* 分类筛选 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['all', ...Object.keys(CATEGORY_LABELS)] as Array<ApplianceCategory | 'all'>).map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && { color: colors.primary }]}>
                {c === 'all' ? '全部' : CATEGORY_LABELS[c]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 电器卡片 */}
        {visible.map((p) => {
          const cfg = appliances[p.id];
          const count = cfg?.count ?? 0;
          const hours = cfg?.hoursPerDay ?? p.hours_per_day;
          const powerW = cfg?.powerW ?? p.power_w;
          const active = count > 0;
          const itemKwh = monthlyEnergyKwh(powerW, hours) * count;
          return (
            <Card key={p.id} style={active && { borderColor: colors.accent }}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <View style={[styles.iconBox, active && { backgroundColor: 'rgba(10,213,239,0.12)' }]}>
                    <MaterialCommunityIcons
                      name={p.icon as IconName}
                      size={22}
                      color={active ? colors.accent : colors.muted}
                    />
                  </View>
                  <View>
                    <Text style={styles.applianceName}>{p.name}</Text>
                    <Text style={styles.muted}>
                      {active ? `${formatEnergy(itemKwh)}/月 · 单台 ${formatEnergy(monthlyEnergyKwh(powerW, hours))}` : '未启用'}
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <Pressable
                    style={styles.stepBtn}
                    disabled={!active}
                    onPress={() => setAppliance(p.id, { count: Math.max(0, count - 1) })}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={active ? colors.foreground : colors.muted} />
                  </Pressable>
                  <Text style={styles.countText}>{count}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setAppliance(p.id, { count: count + 1 })}>
                    <MaterialCommunityIcons name="plus" size={16} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>

              {active && (
                <>
                  {p.power_options && (
                    <View style={styles.optRow}>
                      {p.power_options.map((opt) => (
                        <Pressable
                          key={opt.label}
                          onPress={() => setAppliance(p.id, { powerW: opt.power_w })}
                          style={[styles.optChip, powerW === opt.power_w && styles.optChipActive]}
                        >
                          <Text style={[styles.optText, powerW === opt.power_w && { color: colors.accent }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>功率 {formatPower(powerW)} · 每日 {hours} 小时</Text>
                  </View>
                  <Slider
                    value={hours}
                    onValueChange={(v) => setAppliance(p.id, { hoursPerDay: v })}
                    minimumValue={0}
                    maximumValue={24}
                    step={0.5}
                    minimumTrackTintColor={colors.accent}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.accent}
                  />
                </>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.muted, fontSize: 12 },
  totalKwh: { color: colors.foreground, fontSize: 24, fontWeight: '700', marginTop: 2 },
  estimate: { color: colors.primary, fontSize: 20, fontWeight: '700', marginTop: 2 },
  bringBtn: {
    marginTop: 12, borderColor: colors.border, borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  bringBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(245,183,13,0.1)' },
  chipText: { color: colors.muted, fontSize: 13 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.cardLight, alignItems: 'center', justifyContent: 'center',
  },
  applianceName: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8, borderColor: colors.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: colors.foreground, fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  optChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderColor: colors.border, borderWidth: 1,
  },
  optChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(10,213,239,0.08)' },
  optText: { color: colors.muted, fontSize: 11 },
});

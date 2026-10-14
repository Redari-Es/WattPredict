import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { engine } from '../../src/engine';
import { useAppStore } from '../../src/store';
import {
  DEFAULT_TOU_PROFILE, METER_TYPE_LABELS, type MeterType, type SimulationResult,
} from '../../src/types';
import { formatEnergy } from '../../src/format';
import { Card, CardDesc, CardTitle, FieldLabel, SegmentedBar } from '../../src/ui';
import { colors, PERIOD_COLORS } from '../../src/theme';

const SEG_PALETTE = [colors.primary, colors.accent, colors.violet, colors.green];

function PlanResult({ title, result, highlight }: { title: string; result: SimulationResult; highlight: boolean }) {
  const segments = result.tou && result.tou.length > 0
    ? result.tou.map((t) => ({ label: `${t.name}段`, value: t.cost, color: PERIOD_COLORS[t.name] ?? colors.green, kwh: t.kwh }))
    : result.breakdown.map((b, i) => ({ label: b.tier, value: b.cost, color: SEG_PALETTE[i % SEG_PALETTE.length], kwh: b.kwh }));

  return (
    <Card style={highlight && { borderColor: colors.primary }}>
      <View style={styles.rowBetween}>
        <Text style={styles.planTitle}>{title}</Text>
        {highlight && (
          <View style={styles.badge}><Text style={styles.badgeText}>推荐</Text></View>
        )}
      </View>
      <Text style={styles.planCost}>¥{result.total_cost.toFixed(2)}</Text>
      <Text style={styles.muted}>
        电度电费 ¥{result.energy_cost.toFixed(2)}
        {result.basic_fee != null && result.basic_fee > 0 && ` · 基本电费 ¥${result.basic_fee.toFixed(2)}`}
      </Text>
      <View style={{ marginTop: 10 }}>
        <SegmentedBar segments={segments} />
      </View>
      {segments.map((s) => (
        <View key={s.label} style={[styles.rowBetween, { marginTop: 6 }]}>
          <View style={styles.row}>
            <View style={[styles.segDot, { backgroundColor: s.color }]} />
            <Text style={styles.segLabel}>{s.label}</Text>
          </View>
          <Text style={styles.segValue}>{formatEnergy(s.kwh)} · ¥{s.value.toFixed(2)}</Text>
        </View>
      ))}
    </Card>
  );
}

export default function SimulateScreen() {
  const { meterType, setMeterType, simKwh, clearSimKwh } = useAppStore();
  const [kwh, setKwh] = useState(simKwh ? String(simKwh) : '420');
  const [touProfile, setTouProfile] = useState<Record<string, number>>({ ...DEFAULT_TOU_PROFILE[meterType] });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flat, setFlat] = useState<SimulationResult | null>(null);
  const [tou, setTou] = useState<SimulationResult | null>(null);

  function changeMeterType(t: MeterType) {
    setMeterType(t);
    setTouProfile({ ...DEFAULT_TOU_PROFILE[t] });
  }

  async function run() {
    const monthlyKwh = Number(kwh);
    if (!Number.isFinite(monthlyKwh) || monthlyKwh <= 0) {
      setError('请输入有效的月用电量');
      return;
    }
    setPending(true);
    setError(null);
    clearSimKwh();
    const month = new Date().getMonth() + 1;
    try {
      const base = { province: 'GD', meter_type: meterType, monthly_kwh: monthlyKwh, month };
      const [flatRes, touRes] = await Promise.all([
        engine.simulate({ ...base, has_tou: false }),
        engine.simulate({ ...base, has_tou: true, tou_profile: touProfile }),
      ]);
      setFlat(flatRes);
      setTou(touRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : '瓦特引擎暂不可用');
    } finally {
      setPending(false);
    }
  }

  const diff = flat && tou ? flat.total_cost - tou.total_cost : 0;
  const recommendations = [...new Set([...(flat?.recommendations ?? []), ...(tou?.recommendations ?? [])])];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* 参数 */}
      <Card>
        <CardTitle>推演参数</CardTitle>
        <CardDesc>瓦特引擎将并行推演「现行方案」与「分时方案」</CardDesc>

        <View style={{ marginTop: 14 }}>
          <FieldLabel>电表类型</FieldLabel>
          <View style={styles.segmented}>
            {(Object.keys(METER_TYPE_LABELS) as MeterType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => changeMeterType(t)}
                style={[styles.segBtn, meterType === t && styles.segBtnActive]}
              >
                <Text style={[styles.segBtnText, meterType === t && { color: colors.primary }]}>
                  {METER_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <FieldLabel>月用电量（度）</FieldLabel>
          <TextInput
            style={styles.input}
            value={kwh}
            onChangeText={setKwh}
            keyboardType="decimal-pad"
            placeholder="420"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={{ marginTop: 14 }}>
          <View style={styles.rowBetween}>
            <FieldLabel>分时用电画像</FieldLabel>
            <Pressable onPress={() => setTouProfile({ ...DEFAULT_TOU_PROFILE[meterType] })}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>重置</Text>
            </Pressable>
          </View>
          {(['峰', '平', '谷'] as const).map((period) => (
            <View key={period} style={{ marginTop: 8 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.muted, { color: PERIOD_COLORS[period] }]}>{period}段</Text>
                <Text style={styles.profileValue}>{touProfile[period]}%</Text>
              </View>
              <Slider
                value={touProfile[period]}
                onValueChange={(v) => setTouProfile((p) => ({ ...p, [period]: Math.round(v) }))}
                minimumValue={0}
                maximumValue={100}
                step={1}
                minimumTrackTintColor={PERIOD_COLORS[period]}
                maximumTrackTintColor={colors.border}
                thumbTintColor={PERIOD_COLORS[period]}
              />
            </View>
          ))}
        </View>

        <Pressable style={[styles.runBtn, pending && { opacity: 0.6 }]} onPress={run} disabled={pending}>
          {pending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <MaterialCommunityIcons name="play" size={18} color={colors.background} />
          )}
          <Text style={styles.runBtnText}>{pending ? '推演中…' : '对比推演'}</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
      </Card>

      {/* 结果 */}
      {flat && tou && (
        <>
          <Card style={{ borderColor: diff > 0 ? colors.primary : colors.accent }}>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name={diff > 0 ? 'trending-down' : 'trending-up'}
                size={22}
                color={diff > 0 ? colors.primary : colors.accent}
              />
              <Text style={styles.diffText}>
                {diff > 0
                  ? `分时方案每月可省 ¥${diff.toFixed(2)}（-${((diff / flat.total_cost) * 100).toFixed(1)}%）`
                  : `当前画像下分时反而多付 ¥${Math.abs(diff).toFixed(2)}，建议维持现行方案`}
              </Text>
            </View>
          </Card>

          <PlanResult
            title={meterType === 'residential' ? '现行方案 · 阶梯电价' : '现行方案 · 单一制'}
            result={flat}
            highlight={diff <= 0}
          />
          <PlanResult title="分时方案 · 峰平谷" result={tou} highlight={diff > 0} />

          {tou.savings && (
            <Card style={{ borderColor: colors.accent }}>
              <View style={styles.row}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.accent} />
                <Text style={styles.advice}>{tou.savings.text}</Text>
              </View>
            </Card>
          )}

          {recommendations.length > 0 && (
            <Card>
              <CardTitle>行动建议</CardTitle>
              {recommendations.map((text, i) => (
                <View key={i} style={[styles.row, { marginTop: 10, alignItems: 'flex-start' }]}>
                  <MaterialCommunityIcons name="auto-fix" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.advice, { flex: 1 }]}>{text}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.muted, fontSize: 12 },
  segmented: {
    flexDirection: 'row', backgroundColor: colors.cardLight,
    borderRadius: 10, padding: 4, gap: 4,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segBtnActive: { backgroundColor: 'rgba(245,183,13,0.15)' },
  segBtnText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.cardLight, borderColor: colors.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.foreground, fontSize: 15,
  },
  profileValue: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  runBtn: {
    marginTop: 16, backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  runBtnText: { color: colors.background, fontSize: 15, fontWeight: '700' },
  error: { color: colors.destructive, fontSize: 13, marginTop: 10 },
  diffText: { color: colors.foreground, fontSize: 14, flex: 1, lineHeight: 20 },
  planTitle: { color: colors.muted, fontSize: 13 },
  planCost: { color: colors.foreground, fontSize: 28, fontWeight: '700', marginTop: 4 },
  badge: { backgroundColor: 'rgba(245,183,13,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  segDot: { width: 8, height: 8, borderRadius: 4 },
  segLabel: { color: colors.muted, fontSize: 12 },
  segValue: { color: colors.foreground, fontSize: 12, fontWeight: '500' },
  advice: { color: colors.foreground, fontSize: 13, lineHeight: 19, flexShrink: 1 },
});

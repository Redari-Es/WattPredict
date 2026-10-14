import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { engine } from '../../src/engine';
import { useAppStore } from '../../src/store';
import { METER_TYPE_LABELS, type ReconcileResult } from '../../src/types';
import { formatEnergy } from '../../src/format';
import { Card, CardDesc, CardTitle, FieldLabel } from '../../src/ui';
import { colors, PERIOD_COLORS } from '../../src/theme';

/** 默认账期：上个月 */
function lastMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BillsScreen() {
  const { meterType, bills, addBill, removeBill } = useAppStore();
  const [period, setPeriod] = useState(lastMonth());
  const [totalKwh, setTotalKwh] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [showTou, setShowTou] = useState(false);
  const [peakKwh, setPeakKwh] = useState('');
  const [flatKwh, setFlatKwh] = useState('');
  const [valleyKwh, setValleyKwh] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconcileResult | null>(null);

  const myBills = bills
    .filter((b) => b.meter_type === meterType)
    .sort((a, b) => b.period.localeCompare(a.period));

  async function submit() {
    const kwh = Number(totalKwh);
    const cost = Number(totalCost);
    if (!/^\d{4}-\d{2}$/.test(period)) return setError('账期格式应为 YYYY-MM');
    if (!Number.isFinite(kwh) || kwh <= 0) return setError('请输入有效电量');
    if (!Number.isFinite(cost) || cost < 0) return setError('请输入有效金额');

    setPending(true);
    setError(null);
    const touValues = [Number(peakKwh), Number(flatKwh), Number(valleyKwh)];
    const hasTouDetail = showTou && touValues.every((v) => Number.isFinite(v) && v >= 0)
      && touValues.reduce((a, b) => a + b, 0) > 0;

    try {
      const res = await engine.reconcile({
        province: 'GD', meter_type: meterType,
        total_kwh: kwh, total_cost: cost,
        month: Number(period.split('-')[1]),
        ...(hasTouDetail
          ? { peak_kwh: touValues[0], flat_kwh: touValues[1], valley_kwh: touValues[2] }
          : {}),
      });
      setResult(res);
      addBill({
        period, meter_type: meterType, total_kwh: kwh, total_cost: cost,
        peak_kwh: hasTouDetail ? touValues[0] : null,
        flat_kwh: hasTouDetail ? touValues[1] : null,
        valley_kwh: hasTouDetail ? touValues[2] : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '瓦特引擎暂不可用');
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* 录入 */}
      <Card>
        <CardTitle>录入真实账单</CardTitle>
        <CardDesc>用真实账单校准推演——录得越准，推演越接近你的实际用电（当前电表类型：{METER_TYPE_LABELS[meterType]}，可在推演页切换）</CardDesc>

        <View style={{ marginTop: 14 }}>
          <FieldLabel>账期（YYYY-MM）</FieldLabel>
          <TextInput
            style={styles.input} value={period} onChangeText={setPeriod}
            placeholder="2026-09" placeholderTextColor={colors.muted} autoCapitalize="none"
          />
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <FieldLabel>账单电量（度）</FieldLabel>
            <TextInput
              style={styles.input} value={totalKwh} onChangeText={setTotalKwh}
              keyboardType="decimal-pad" placeholder="420" placeholderTextColor={colors.muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FieldLabel>账单金额（元）</FieldLabel>
            <TextInput
              style={styles.input} value={totalCost} onChangeText={setTotalCost}
              keyboardType="decimal-pad" placeholder="259.95" placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        <View style={[styles.rowBetween, { marginTop: 14 }]}>
          <Text style={styles.muted}>分时电量明细（反推真实画像）</Text>
          <Switch
            value={showTou} onValueChange={setShowTou}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.foreground}
          />
        </View>
        {showTou && (
          <View style={[styles.row, { marginTop: 8 }]}>
            {([
              ['峰段', peakKwh, setPeakKwh],
              ['平段', flatKwh, setFlatKwh],
              ['谷段', valleyKwh, setValleyKwh],
            ] as const).map(([label, val, setter]) => (
              <View key={label} style={{ flex: 1 }}>
                <FieldLabel>{label}</FieldLabel>
                <TextInput
                  style={styles.input} value={val} onChangeText={setter}
                  keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted}
                />
              </View>
            ))}
          </View>
        )}

        <Pressable style={[styles.runBtn, pending && { opacity: 0.6 }]} onPress={submit} disabled={pending}>
          {pending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <MaterialCommunityIcons name="scale-balance" size={18} color={colors.background} />
          )}
          <Text style={styles.runBtnText}>{pending ? '核对中…' : '核对账单'}</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </Card>

      {/* 核对报告 */}
      {result && (
        <Card>
          <CardTitle>核对报告</CardTitle>
          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>实际均价</Text>
              <Text style={styles.statValue}>¥{result.implied_avg_price.toFixed(4)}/度</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>推演金额</Text>
              <Text style={styles.statValue}>¥{result.simulated.total_cost.toFixed(2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted}>偏差</Text>
              <Text style={[styles.statValue, { color: Math.abs(result.deviation_pct) <= 3 ? colors.green : colors.primary }]}>
                {result.deviation_pct >= 0 ? '+' : ''}{result.deviation_pct}%
              </Text>
            </View>
          </View>

          {result.implied_profile && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.muted}>反推真实画像</Text>
              {(['峰', '平', '谷'] as const).map((p) => (
                <View key={p} style={{ marginTop: 8 }}>
                  <View style={styles.rowBetween}>
                    <Text style={{ color: PERIOD_COLORS[p], fontSize: 12 }}>{p}段</Text>
                    <Text style={styles.profileValue}>{result.implied_profile?.[p]}%</Text>
                  </View>
                  <View style={styles.profileTrack}>
                    <View
                      style={{
                        width: `${result.implied_profile?.[p] ?? 0}%`,
                        backgroundColor: PERIOD_COLORS[p],
                        height: '100%', borderRadius: 4,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ marginTop: 14, gap: 8 }}>
            {result.diagnosis.map((text, i) => (
              <View key={i} style={styles.diagBox}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={colors.accent} style={{ marginTop: 1 }} />
                <Text style={styles.diagText}>{text}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 历史 */}
      <Card>
        <CardTitle>账单历史</CardTitle>
        {myBills.length > 0 ? (
          myBills.map((b) => (
            <View key={b.id} style={[styles.rowBetween, styles.billRow]}>
              <View>
                <Text style={styles.billPeriod}>{b.period}</Text>
                <Text style={styles.muted}>
                  {formatEnergy(b.total_kwh)} · ¥{(b.total_cost / b.total_kwh).toFixed(4)}/度
                  {b.peak_kwh != null && ' · 含分时明细'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.billCost}>¥{b.total_cost.toFixed(2)}</Text>
                <Pressable onPress={() => removeBill(b.id)} hitSlop={8}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <CardDesc>还没有账单记录——录入第一张，让瓦特预言开始学习你的真实用电</CardDesc>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.muted, fontSize: 12 },
  input: {
    backgroundColor: colors.cardLight, borderColor: colors.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.foreground, fontSize: 15,
  },
  runBtn: {
    marginTop: 16, backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  runBtnText: { color: colors.background, fontSize: 15, fontWeight: '700' },
  error: { color: colors.destructive, fontSize: 13, marginTop: 10 },
  statValue: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 2 },
  profileValue: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  profileTrack: {
    height: 8, borderRadius: 4, backgroundColor: colors.border,
    overflow: 'hidden', marginTop: 4,
  },
  diagBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(10,213,239,0.06)', borderColor: 'rgba(10,213,239,0.25)',
    borderWidth: 1, borderRadius: 10, padding: 10,
  },
  diagText: { color: colors.foreground, fontSize: 13, lineHeight: 19, flex: 1 },
  billRow: { marginTop: 12, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: 1 },
  billPeriod: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  billCost: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});

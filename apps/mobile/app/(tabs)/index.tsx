import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { engine, ENGINE_URL } from '../../src/engine';
import { useAppStore } from '../../src/store';
import { appliancePresets } from '../../src/presets';
import { formatEnergy } from '../../src/format';
import { monthlyEnergyKwh } from '../../src/format';
import { METER_TYPE_LABELS } from '../../src/types';
import { Card, CardDesc, CardTitle } from '../../src/ui';
import { colors } from '../../src/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const QUICK_ACTIONS: Array<{ route: '/simulate' | '/appliances' | '/bills'; icon: IconName; title: string; desc: string }> = [
  { route: '/simulate', icon: 'calculator-variant-outline', title: '电费推演', desc: '现行 vs 分时双方案对比' },
  { route: '/appliances', icon: 'power-plug-outline', title: '电器估算', desc: '22 种预设，30 天月耗电' },
  { route: '/bills', icon: 'receipt-text-outline', title: '账单核对', desc: '真实账单反推用电画像' },
];

export default function OverviewScreen() {
  const router = useRouter();
  const { appliances, bills, meterType } = useAppStore();

  const { data: engineOk } = useQuery({
    queryKey: ['engine-health'],
    queryFn: engine.health,
    refetchInterval: 30_000,
  });

  const activeCount = Object.values(appliances).filter((a) => a.count > 0).length;
  const totalCount = Object.values(appliances).reduce((s, a) => s + a.count, 0);
  const totalKwh = Object.entries(appliances).reduce((sum, [id, a]) => {
    const preset = appliancePresets.find((p) => p.id === id);
    const powerW = a.powerW ?? preset?.power_w;
    return powerW ? sum + monthlyEnergyKwh(powerW, a.hoursPerDay) * a.count : sum;
  }, 0);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {/* 引擎状态 */}
      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="flash" size={22} color={colors.primary} />
            </View>
            <View>
              <CardTitle>瓦特预言</CardTitle>
              <CardDesc>WATTPREDICT · 广东</CardDesc>
            </View>
          </View>
          <View style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: engineOk === undefined ? colors.muted : engineOk ? colors.green : colors.destructive },
              ]}
            />
            <Text style={styles.muted}>
              {engineOk === undefined ? '检测中' : engineOk ? '瓦特引擎在线' : '引擎离线'}
            </Text>
          </View>
        </View>
        {engineOk === false && (
          <Text style={styles.hint}>
            无法连接 {ENGINE_URL}{'\n'}真机请设置 EXPO_PUBLIC_ENGINE_URL 为电脑局域网 IP
          </Text>
        )}
      </Card>

      {/* 数据速览 */}
      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{formatEnergy(totalKwh)}</Text>
          <Text style={styles.statLabel}>电器月耗电估算</Text>
          <Text style={styles.statSub}>{activeCount} 类 · {totalCount} 台</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{bills.length}</Text>
          <Text style={styles.statLabel}>已录账单</Text>
          <Text style={styles.statSub}>{METER_TYPE_LABELS[meterType]}电表</Text>
        </Card>
      </View>

      {/* 快捷入口 */}
      {QUICK_ACTIONS.map((a) => (
        <Pressable key={a.route} onPress={() => router.push(a.route)}>
          {({ pressed }) => (
            <Card style={pressed && { opacity: 0.8 }}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <MaterialCommunityIcons name={a.icon} size={22} color={colors.primary} />
                  <View style={{ marginLeft: 12 }}>
                    <CardTitle>{a.title}</CardTitle>
                    <CardDesc>{a.desc}</CardDesc>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
              </View>
            </Card>
          )}
        </Pressable>
      ))}

      {/* 最近账单 */}
      {bills.length > 0 && (
        <Card>
          <CardTitle>最近账单</CardTitle>
          {bills.slice(0, 3).map((b) => (
            <View key={b.id} style={[styles.rowBetween, { marginTop: 12 }]}>
              <View>
                <Text style={styles.billPeriod}>{b.period}</Text>
                <Text style={styles.muted}>{METER_TYPE_LABELS[b.meter_type]} · {formatEnergy(b.total_kwh)}</Text>
              </View>
              <Text style={styles.billCost}>¥{b.total_cost.toFixed(2)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(245,183,13,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  muted: { color: colors.muted, fontSize: 12 },
  hint: { color: colors.destructive, fontSize: 12, marginTop: 10, lineHeight: 17 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1 },
  statValue: { color: colors.foreground, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  statSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  billPeriod: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  billCost: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});

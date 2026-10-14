import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const TABS: Array<{ name: string; title: string; icon: IconName }> = [
  { name: 'index', title: '概览', icon: 'view-dashboard-outline' },
  { name: 'simulate', title: '推演', icon: 'calculator-variant-outline' },
  { name: 'appliances', title: '电器', icon: 'power-plug-outline' },
  { name: 'bills', title: '账单', icon: 'receipt-text-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={t.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

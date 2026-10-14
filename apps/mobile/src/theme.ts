/** 主题：与 Web 端暗色未来感对齐（hsl → hex） */
export const colors = {
  background: '#0e0e11', // hsl(240 10% 6%)
  card: '#16161c',
  cardLight: '#1d1d24',
  border: '#232329', // hsl(240 4% 16%)
  foreground: '#fafafa',
  muted: '#96969e', // hsl(240 5% 64%)
  primary: '#f5b70d', // 琥珀 hsl(43 96% 56%)
  accent: '#0ad5ef', // 青色 hsl(187 92% 50%)
  violet: '#a06ef2', // hsl(262 83% 65%)
  green: '#24c184', // hsl(152 69% 45%)
  destructive: '#e5534b',
} as const;

/** 峰平谷配色（与 Web 端一致） */
export const PERIOD_COLORS: Record<string, string> = {
  峰: colors.primary,
  平: colors.accent,
  谷: colors.violet,
};

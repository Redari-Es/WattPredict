/** 电量/功率格式化（与 Web 端 lib/units.ts 对齐）：1 度 = 1 kWh = 1000 Wh */

function trimNum(v: number, digits = 1): string {
  return String(Number(v.toFixed(digits)));
}

/** 电量自动格式化：≥1 万度显示万度，≥1 度显示度，否则 Wh */
export function formatEnergy(kwh: number): string {
  if (kwh < 0) return `-${formatEnergy(-kwh)}`;
  if (kwh >= 10_000) return `${trimNum(kwh / 10_000)} 万度`;
  if (kwh >= 1) return `${trimNum(kwh)} 度`;
  if (kwh > 0) return `${Math.round(kwh * 1000)} Wh`;
  return '0 度';
}

/** 功率自动格式化：≥ 1000 W 显示 kW */
export function formatPower(w: number): string {
  if (w >= 1000) return `${trimNum(w / 1000)} kW`;
  return `${trimNum(w, 0)} W`;
}

/** 月耗电量估算：功率(W) × 每日时长 × 30 天 → kWh */
export function monthlyEnergyKwh(powerW: number, hoursPerDay: number): number {
  return (powerW * hoursPerDay * 30) / 1000;
}

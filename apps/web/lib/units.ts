/**
 * 电力单位换算工具
 *
 * 单位约定：
 *   - 电量（能耗）：Wh / kWh / 度（1 度 = 1 kWh，中国居民用电习惯单位）
 *   - 功率：W / kW
 *   - 能耗 = 功率 × 时间：kWh = W × h ÷ 1000
 */

export type EnergyUnit = 'Wh' | 'kWh' | '度';
export type PowerUnit = 'W' | 'kW';

export const ENERGY_UNITS: readonly EnergyUnit[] = ['Wh', 'kWh', '度'];
export const POWER_UNITS: readonly PowerUnit[] = ['W', 'kW'];

const ENERGY_TO_KWH: Record<EnergyUnit, number> = { Wh: 0.001, kWh: 1, 度: 1 };
const POWER_TO_W: Record<PowerUnit, number> = { W: 1, kW: 1000 };

/** 任意电量单位 → kWh */
export function toKwh(value: number, unit: EnergyUnit): number {
  return value * ENERGY_TO_KWH[unit];
}

/** kWh → 任意电量单位 */
export function fromKwh(kwh: number, unit: EnergyUnit): number {
  return kwh / ENERGY_TO_KWH[unit];
}

/** 电量单位互转 */
export function convertEnergy(value: number, from: EnergyUnit, to: EnergyUnit): number {
  return fromKwh(toKwh(value, from), to);
}

/** 任意功率单位 → W */
export function toW(value: number, unit: PowerUnit): number {
  return value * POWER_TO_W[unit];
}

/** W → 任意功率单位 */
export function fromW(w: number, unit: PowerUnit): number {
  return w / POWER_TO_W[unit];
}

/** 功率单位互转 */
export function convertPower(value: number, from: PowerUnit, to: PowerUnit): number {
  return fromW(toW(value, from), to);
}

/** 由功率与时长估算能耗（kWh）：kWh = W × h ÷ 1000 */
export function energyKwh(powerW: number, hours: number): number {
  return (powerW * hours) / 1000;
}

/** 月能耗估算（默认 30 天） */
export function monthlyEnergyKwh(powerW: number, hoursPerDay: number, days = 30): number {
  return energyKwh(powerW, hoursPerDay * days);
}

/** 去掉无意义的小数尾零：12.50 → "12.5"，153.00 → "153" */
function trimNum(n: number, digits = 2): string {
  return String(Number(n.toFixed(digits)));
}

/**
 * 电量自动格式化，按量级选择最合适的单位：
 *   < 1 kWh → Wh；1–10000 → 度；≥ 10000 → 万度
 */
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

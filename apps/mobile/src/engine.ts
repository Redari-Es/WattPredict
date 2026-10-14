/** 瓦特引擎客户端（移动端直连，通过 EXPO_PUBLIC_ENGINE_URL 配置） */
import type {
  ReconcilePayload, ReconcileResult, SimulatePayload, SimulationResult,
} from './types';

/**
 * 真机调试时引擎地址必须是局域网 IP，如 http://192.168.1.10:8088
 * （Android 模拟器用 http://10.0.2.2:8088 访问宿主机）
 */
export const ENGINE_URL = process.env.EXPO_PUBLIC_ENGINE_URL ?? 'http://localhost:8088';

async function post<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(`瓦特引擎调用失败: ${err.error}`);
  }
  return res.json() as Promise<T>;
}

export const engine = {
  simulate: (payload: SimulatePayload) => post<SimulationResult>('/api/simulate', payload),
  reconcile: (payload: ReconcilePayload) => post<ReconcileResult>('/api/reconcile', payload),
  health: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${ENGINE_URL}/healthz`);
      return res.ok;
    } catch {
      return false;
    }
  },
};

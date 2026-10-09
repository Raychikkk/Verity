import type { ChatRequest, ChatResponse } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';

class Retryable extends Error {}
const GATEWAY = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Бесплатный хостинг засыпает после ~15 минут простоя и просыпается около минуты.
 * Пока сервер просыпается, запрос падает (сеть/502/503) — повторяем и сообщаем UI через onRetry.
 * Для kind = 'message' повторяем только то, что точно не дошло до сервера.
 */
export async function callChat(req: ChatRequest, onRetry?: (attempt: number) => void): Promise<ChatResponse> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const r = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (GATEWAY.has(r.status)) throw new Retryable();
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as ChatResponse;
    } catch (e) {
      const name = (e as Error).name;
      const retryable =
        e instanceof Retryable || e instanceof TypeError || (req.kind === 'open' && name === 'AbortError');
      if (!retryable || attempt >= 8) throw e;
      onRetry?.(attempt + 1);
      await sleep(4000);
    } finally {
      clearTimeout(timer);
    }
  }
}

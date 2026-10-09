import crypto from 'node:crypto';

/**
 * Проверка подписи Telegram initData (HMAC-SHA256).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Возвращает { id, first_name } или null.
 */
export function verifyInitData(initData, botToken, maxAgeSec = 86400) {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = crypto.createHmac('sha256', secret).update(dataCheckString).digest();
  let given;
  try { given = Buffer.from(hash, 'hex'); } catch { return null; }
  if (given.length !== calc.length || !crypto.timingSafeEqual(calc, given)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;

  try {
    const u = JSON.parse(params.get('user') ?? 'null');
    return u?.id ? { id: u.id, first_name: u.first_name || 'Незнакомец' } : null;
  } catch {
    return null;
  }
}

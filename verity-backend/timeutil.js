export function validTz(tz) {
  if (typeof tz !== 'string') return 'UTC';
  try { new Intl.DateTimeFormat('ru-RU', { timeZone: tz }); return tz; } catch { return 'UTC'; }
}

/** Локальный час 0–23 в часовом поясе пользователя */
export function localHour(ms, tz) {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(ms)
  );
}

export function timeOfDay(h) {
  if (h < 5) return 'глубокая ночь';
  if (h < 11) return 'утро';
  if (h < 18) return 'день';
  return 'вечер';
}

export const isNight = (h) => h >= 0 && h < 5;

export const formatFull = (ms, tz) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(ms);

export const formatShort = (ms, tz) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(ms);

export function ago(now, ts) {
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн. назад`;
}

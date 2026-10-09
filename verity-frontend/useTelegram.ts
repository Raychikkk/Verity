import { useMemo } from 'react';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor('#050805');
    tg.setBackgroundColor('#050805');
    // «Не закрывай приложение»: Telegram спросит подтверждение при закрытии
    tg.enableClosingConfirmation();
  } catch { /* старые клиенты */ }
}

export function useTelegram() {
  return useMemo(() => {
    const u = tg?.initDataUnsafe?.user;
    return {
      tg,
      initData: tg?.initData ?? '',
      // вне Telegram (dev в браузере) подставляем гостя
      user: { id: u?.id ?? 1, first_name: u?.first_name ?? 'Гость' },
    };
  }, []);
}

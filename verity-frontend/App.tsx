import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';
import { Chat } from './Chat';
import { useAudio } from './useAudio';
import { useTelegram } from './useTelegram';
import type { VerityState } from './types';

const STATUS: Record<VerityState, string> = {
  calm: 'онлайн',
  watching: 'наблюдает',
  glitch: 'СБОЙ',
};

export default function App() {
  const { tg, initData, user } = useTelegram();
  const [vState, setVState] = useState<VerityState>('calm');
  const [warn, setWarn] = useState(false);
  const timer = useRef<number>();
  const audio = useAudio(vState);

  // glitch — вспышка: ~1.8 с, затем Верити «наблюдает»
  const applyState = useCallback(
    (s: VerityState) => {
      window.clearTimeout(timer.current);
      setVState(s);
      if (s === 'glitch') {
        tg?.HapticFeedback?.notificationOccurred('error');
        timer.current = window.setTimeout(() => setVState('watching'), 1800);
      }
    },
    [tg]
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onSound = () => (audio.enabled ? audio.toggle() : setWarn(true));

  return (
    <div
      className="flex h-[100dvh] flex-col bg-crt-bg font-mono text-crt-green"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="flex items-center gap-3 border-b border-crt-dim/50 px-3 py-2">
        <Avatar state={vState} />
        <div className="min-w-0 flex-1">
          <div className={`text-lg tracking-widest ${vState === 'glitch' ? 'animate-glitch-text text-crt-red' : ''}`}>VERITY</div>
          <div className="truncate text-xs text-crt-dim">
            {STATUS[vState]} · {user.first_name} · вымышленный персонаж
          </div>
        </div>
        {/* звук: правый верхний угол, выключен по умолчанию */}
        <button
          onClick={onSound}
          className={`border px-2 py-1 text-xs ${audio.enabled ? 'border-crt-green text-crt-green' : 'border-crt-dim text-crt-dim'}`}
          aria-pressed={audio.enabled}
        >
          звук: {audio.enabled ? 'вкл' : 'выкл'}
        </button>
      </header>

      <Chat user={user} initData={initData} onState={applyState} />

      {warn && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-xs border border-crt-red bg-crt-bg p-4">
            <p className="mb-1 text-crt-red">⚠ Может быть громко</p>
            <p className="mb-4 text-sm text-crt-dim">Шум и низкий гул. Уменьши громкость заранее.</p>
            <div className="flex gap-2">
              <button
                className="flex-1 border border-crt-red py-2 text-crt-red"
                onClick={() => { setWarn(false); audio.toggle(); }}
              >
                включить
              </button>
              <button className="flex-1 border border-crt-dim py-2 text-crt-dim" onClick={() => setWarn(false)}>
                нет
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="crt-overlay" aria-hidden />
    </div>
  );
}

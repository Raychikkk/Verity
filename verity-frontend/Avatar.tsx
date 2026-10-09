import type { VerityState } from './types';

/**
 * Своя картинка Верити: положи файл рядом с App.tsx под именем
 * verity.png (или verity.jpg / verity.jpeg / verity.webp / verity.gif).
 * Если файла нет — рисуется пиксельный глаз (запасной вариант).
 */
const found = import.meta.glob<string>('./verity.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const IMG: string | undefined = Object.values(found)[0];

const COLOR: Record<VerityState, string> = {
  calm: 'text-crt-green',
  watching: 'text-crt-red',
  glitch: 'text-crt-red',
};

export function Avatar({ state, size = 56 }: { state: VerityState; size?: number }) {
  if (IMG) {
    return (
      <div
        className={`relative overflow-hidden border ${state === 'calm' ? 'border-crt-green' : 'border-crt-red'} ${
          state === 'glitch' ? 'animate-avatar-glitch' : ''
        } transition-colors duration-500`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <img src={IMG} alt="" draggable={false} className={`avatar-img avatar-img-${state} h-full w-full object-cover`} />
        {/* watching — красноватая дымка, glitch — сильнее */}
        <div
          className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${
            state === 'calm' ? 'bg-crt-green/10' : state === 'watching' ? 'bg-crt-red/20' : 'bg-crt-red/40'
          }`}
        />
      </div>
    );
  }

  // Запасной вариант: пиксельный глаз
  return (
    <div
      className={`${COLOR[state]} ${state === 'glitch' ? 'animate-avatar-glitch' : ''} transition-colors duration-500`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width="100%" height="100%" shapeRendering="crispEdges" className={`avatar avatar-${state}`}>
        <defs>
          <clipPath id="eye-clip"><circle cx="16" cy="16" r="13" /></clipPath>
        </defs>
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <g clipPath="url(#eye-clip)">
          <circle className="pupil" cx="16" cy="16" r="3.5" fill="currentColor" />
          <rect className="lid lid-top" x="0" y="-16" width="32" height="16" fill="#050805" />
          <rect className="lid lid-bottom" x="0" y="32" width="32" height="16" fill="#050805" />
        </g>
      </svg>
    </div>
  );
}

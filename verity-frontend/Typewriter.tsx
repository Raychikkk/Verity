import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  text: string;
  animate: boolean;
  onTick?: () => void;
  onDone?: () => void;
}

/** Посимвольная «печать» с паузами на знаках препинания и кривым ритмом */
export function Typewriter({ text, animate, onTick, onDone }: Props) {
  const chars = useMemo(() => Array.from(text), [text]); // корректно для суррогатов и ▓▒░
  const [n, setN] = useState(animate ? 0 : chars.length);
  const cb = useRef({ onTick, onDone });
  cb.current = { onTick, onDone };

  useEffect(() => {
    if (!animate) { setN(chars.length); return; }
    let i = 0;
    let t: number;
    const step = () => {
      i += 1;
      setN(i);
      cb.current.onTick?.();
      if (i >= chars.length) { cb.current.onDone?.(); return; }
      const c = chars[i - 1];
      const delay = /[.!?…]/.test(c) ? 320 : /[,;:—]/.test(c) ? 140 : /[▓▒░█]/.test(c) ? 90 : 16 + Math.random() * 34;
      t = window.setTimeout(step, delay);
    };
    t = window.setTimeout(step, 250);
    return () => window.clearTimeout(t);
  }, [chars, animate]);

  return (
    <>
      {chars.slice(0, n).join('')}
      {animate && n < chars.length && <span className="cursor" />}
    </>
  );
}

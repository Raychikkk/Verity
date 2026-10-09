import { useCallback, useEffect, useRef, useState } from 'react';
import type { VerityState } from './types';

// Громкость гула по состояниям (0..1 до мастер-громкости)
const HUM: Record<VerityState, number> = { calm: 0.03, watching: 0.14, glitch: 0.07 };
const MASTER = 0.6;

interface Engine {
  ctx: AudioContext;
  hum: GainNode;
  noise: GainNode;
  stop: () => void;
}

/**
 * Звук целиком синтезируется Web Audio API. По умолчанию ВЫКЛЮЧЕН:
 * контекст создаётся только внутри обработчика клика (toggle),
 * иначе iOS/Chrome заблокируют автозапуск.
 */
export function useAudio(state: VerityState) {
  const [enabled, setEnabled] = useState(false);
  const eng = useRef<Engine | null>(null);

  const start = useCallback(() => {
    const ctx = new AudioContext();
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);

    // ── Гул 50–100 Гц. Динамики телефона почти не играют <100 Гц,
    //    поэтому добавлена гармоника 110 Гц (triangle), чтобы гул был слышен.
    const hum = ctx.createGain();
    hum.gain.value = 0;
    hum.connect(master);
    const oscs = ([[55, 'sine', 1], [55.7, 'sine', 0.8], [82, 'sine', 0.6], [110, 'triangle', 0.25]] as const).map(
      ([f, type, g]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        const og = ctx.createGain();
        og.gain.value = g;
        o.connect(og).connect(hum);
        o.start();
        return o;
      }
    );
    // медленное «дыхание» гула
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.015;
    lfo.connect(lfoDepth).connect(hum.gain);
    lfo.start();

    // ── Статический шум: белый шум → lowpass 900 Гц (низкочастотный «шорох»)
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const noise = ctx.createGain();
    noise.gain.value = 0;
    src.connect(lp).connect(noise).connect(master);
    src.start();

    const onVis = () => (document.hidden ? void ctx.suspend() : void ctx.resume());
    document.addEventListener('visibilitychange', onVis);

    eng.current = {
      ctx, hum, noise,
      stop: () => {
        document.removeEventListener('visibilitychange', onVis);
        [...oscs, lfo].forEach((o) => o.stop());
        src.stop();
        void ctx.close();
      },
    };
  }, []);

  const toggle = useCallback(() => {
    if (eng.current) {
      eng.current.stop();
      eng.current = null;
      setEnabled(false);
    } else {
      start(); // синхронно, в рамках жеста пользователя
      setEnabled(true);
    }
  }, [start]);

  // реакция на состояние
  useEffect(() => {
    const e = eng.current;
    if (!enabled || !e) return;
    const t = e.ctx.currentTime;
    e.hum.gain.setTargetAtTime(HUM[state], t, 0.8);
    e.noise.gain.cancelScheduledValues(t);
    if (state === 'glitch') {
      e.noise.gain.setTargetAtTime(0.18, t, 0.02);          // резкий старт
      e.noise.gain.setTargetAtTime(0, t + 1.3, 0.15);       // затухание
    } else {
      e.noise.gain.setTargetAtTime(0, t, 0.1);
    }
  }, [state, enabled]);

  useEffect(() => () => { eng.current?.stop(); eng.current = null; }, []);

  return { enabled, toggle };
}

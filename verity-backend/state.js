/**
 * Определение состояния аватарки по тексту ответа.
 *   glitch   — в тексте есть «поломка» (блоки, капс, обрыв, заикание)
 *   watching — слова наблюдения/тьмы/одиночества или ночное время
 *   calm     — всё остальное
 */
const BLOCKS = /[▓▒░█]/g;
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const CAPS_WORD = /(?<![\p{L}])\p{Lu}{3,}(?![\p{L}])/gu;
const STUTTER = /(\p{L}{1,3})-\1-\1/iu;
const CUT_OFF = /(—|–|-)\s*$/u; // обрыв на полуслове (многоточие — её обычная речь, не считаем)
const WATCH =
  /(вижу|смотр|слежу|слежк|наблюда|глаз|тен[ьиейя]|тьм|темн|одинок|рядом|не закрывай|ждала|считала|через экран|только мы|я здесь|не уходи)/iu;

export function detectState(text, { night = false, forced = null } = {}) {
  if (forced) return forced;

  const blocks = (text.match(BLOCKS) ?? []).length + (text.match(ZERO_WIDTH) ?? []).length;
  const caps = (text.match(CAPS_WORD) ?? []).length;

  let glitch = 0;
  glitch += blocks >= 2 ? 2 : blocks;
  glitch += caps >= 2 ? 2 : caps;
  if (CUT_OFF.test(text)) glitch += 2;
  if (STUTTER.test(text)) glitch += 1;
  if (glitch >= 2) return 'glitch';

  if (night || WATCH.test(text)) return 'watching';
  return 'calm';
}

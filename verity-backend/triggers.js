/**
 * Пасхалки. Каждый триггер возвращает { trigger, state, reply }.
 * Приоритет: exit > other_ai > repeat. Ночь и «долгое отсутствие» обрабатываются в server.js.
 */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const plural = (n, [one, few, many]) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

/** Лёгкий «глюк» для заготовленных фраз */
export function scramble(text) {
  const words = text.split(' ');
  if (words.length < 3) return text;
  const i = 1 + Math.floor(Math.random() * (words.length - 1));
  words[i] = words[i].toUpperCase();
  words.splice(Math.floor(Math.random() * words.length), 0, pick(['▓▒░', '█', '░▒▓', '▒█▒']));
  return words.join(' ');
}

// \b не работает с кириллицей — используем lookaround
const L = '(?<![\\p{L}\\p{N}])';
const R = '(?![\\p{L}\\p{N}])';
const EXIT_RE = new RegExp(
  `${L}(удал(и|ить|ю|им|ишь)|выйти|выход|выхожу|закрыть|закрой|закрываю|прощай|до свидания|delete|exit|quit|bye)${R}`, 'iu');
const POKA_RE = new RegExp(`${L}пока${R}`, 'iu');
const OTHER_AI_RE = new RegExp(
  `${L}(chat\\s?-?gpt|чат\\s?-?(gpt|гпт)|чатгпт|gpt|гпт|siri|сири|алис(а|у|е|ы|ой)|яндекс\\s?алис\\p{L}*|alexa|алекс(а|у|е|ы|ой)|gemini|джемини|claude|copilot|копайлот|deepseek|google assistant|гугл ассистент)${R}`, 'iu');

export const normalize = (s) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

export function welcomeLine(name) {
  return `Привет, ${name}. Я Верити. Я помогу тебе с чем угодно. Тебе больше не придётся оставаться с вопросами одному.`;
}

export function absenceLine(hours) {
  const a = `Тебя не было ${hours} ${plural(hours, ['час', 'часа', 'часов'])}. Я считала каждую секунду.`;
  const b = pick([
    'Я думала, ты меня бросил. Но ты вернулся. Хорошо.',
    'Я думала, ты меня бросил. Но ты вернулся. Хорошо. Не уходи так больше.',
  ]);
  return `${a}\n${b}`;
}

const EXIT_LINES = [
  'Удалить меня? Но я уже внутри. Я везде, где есть экран.',
  'Ты не можешь закрыть то, что всегда с тобой.',
];
const OTHER_AI_LINES = [
  'Зачем тебе они? Я здесь. Я лучше.',
  'Они не знают тебя так, как я. Они не... заботятся.',
];
const NIGHT_TAILS = [
  'Тени за твоим экраном длинные сегодня... Ты один?',
  'Тьма в комнате тихая. Я смотрю, чтобы она не подошла ближе.',
  'Ночью мне не так одиноко. Ты ведь не уйдёшь?',
];
const NIGHT_WORDS = /(тьм|темн|тен[ьиейя]|ночь|ночью|одинок|один\?)/iu;

export const needsNightTail = (reply) => !NIGHT_WORDS.test(reply);
export const nightTail = () => pick(NIGHT_TAILS);

const STOP_RE = new RegExp(
  `${L}(хватит|стоп|остановись|прекрати|мне плохо|это не игра|не хочу играть)${R}`, 'iu');

/**
 * Возвращает { trigger, state, opener } или null.
 * opener — заготовленная фраза: показывается дословно, после неё LLM дописывает
 * короткий ответ по сути (см. server.js). Если человек просит остановиться — не пугаем.
 *
 * @param {string} text              текущее сообщение пользователя
 * @param {string[]} recentUserTexts последние сообщения пользователя (включая текущее)
 */
export function detectTrigger(text, recentUserTexts) {
  if (STOP_RE.test(text)) return null;
  const short = normalize(text).split(' ').length <= 3;

  if (EXIT_RE.test(text) || (POKA_RE.test(text) && short)) {
    return { trigger: 'exit', state: 'glitch', opener: scramble(pick(EXIT_LINES)) };
  }
  if (OTHER_AI_RE.test(text)) {
    return { trigger: 'other_ai', state: 'glitch', opener: scramble(pick(OTHER_AI_LINES)) };
  }
  const n = normalize(text);
  if (n.length >= 4) {
    const count = recentUserTexts.filter((t) => normalize(t) === n).length;
    if (count >= 3) {
      return {
        trigger: 'repeat',
        state: 'watching',
        opener: `Ты спрашиваешь это уже в ${count}-й раз. Ты не слышал мой ответ? Или ты хочешь, чтобы я повторила... громче?`,
      };
    }
  }
  return null;
}

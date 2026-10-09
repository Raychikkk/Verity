import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { verifyInitData } from './auth.js';
import { addMessage, getUser, lastMessages, lastUserTexts, touchUser } from './db.js';
import { askLLM } from './llm.js';
import { buildSystemPrompt } from './prompt.js';
import { detectState } from './state.js';
import { isNight, localHour, validTz } from './timeutil.js';
import { absenceLine, detectTrigger, needsNightTail, nightTail, welcomeLine } from './triggers.js';

const HISTORY_LIMIT = 20;   // сколько сообщений уходит в LLM
const UI_HISTORY = 50;      // сколько сообщений показываем при открытии
const ABSENCE_HOURS = 24;

const app = express();
app.set('trust proxy', 1); // Render стоит за прокси
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '16kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_, res) => res.json({ ok: true }));

function authenticate(body) {
  if (process.env.DEV_BYPASS_AUTH === '1' && body.user?.id) {
    return { id: Number(body.user.id), first_name: String(body.user.first_name ?? 'Гость') };
  }
  return verifyInitData(body.init_data, process.env.BOT_TOKEN);
}

const toHistory = (rows) =>
  rows.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp, state: m.state ?? null }));

/** Инструкция для гибрида: заготовленная фраза уже сказана, LLM дописывает суть */
const hybridDirective = (opener) =>
  `Твой ответ уже начался с фразы: «${opener}». Она будет показана пользователю ПЕРЕД твоим текстом — не повторяй и не пересказывай её, начни сразу с продолжения. ` +
  'Продолжение: 1–3 коротких предложения. Если пользователь спросил что-то безобидное — коротко и по делу ответь на это, оставаясь в образе. ' +
  'Не противоречь фразе и не извиняйся за неё. Если пользователь пишет всерьёз о беде или просит остановить игру — выйди из образа.';

app.post('/api/chat', async (req, res) => {
  try {
    const body = req.body ?? {};
    const user = authenticate(body);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const now = Date.now();
    const tz = validTz(body.client?.tz);
    const known = await getUser(user.id);
    const lastActive = known ? Number(known.last_active) : null;
    const hoursSince = lastActive ? Math.floor((now - lastActive) / 3_600_000) : 0;

    // ───────────── Приложение открыто ─────────────
    if (body.kind === 'open') {
      const history = toHistory(await lastMessages(user.id, UI_HISTORY));
      let out = { reply: null, state: 'calm', trigger: null };

      if (!known) {
        out = { reply: welcomeLine(user.first_name), state: 'calm', trigger: 'welcome' };
      } else if (hoursSince >= ABSENCE_HOURS) {
        out = { reply: absenceLine(hoursSince), state: 'watching', trigger: 'absence' };
      }
      if (out.reply) await addMessage(user.id, 'assistant', out.reply, out.state, now);
      await touchUser(user.id, user.first_name, now);

      return res.json({
        reply: out.reply, state: out.state, trigger: out.trigger,
        is_first_message: Boolean(out.reply),   // Верити пишет первой
        history, server_time: now,
      });
    }

    // ───────────── Обычное сообщение ─────────────
    const text = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    if (!text) return res.status(400).json({ error: 'empty_message' });

    const history = await lastMessages(user.id, HISTORY_LIMIT);   // ДО текущего сообщения
    await addMessage(user.id, 'user', text, null, now);
    const night = isNight(localHour(now, tz));
    const trig = detectTrigger(text, await lastUserTexts(user.id, 100));
    const ctx = { userName: user.first_name, now, tz, history, hoursSince };

    let out;
    try {
      if (trig) {
        // Гибрид: заготовленная фраза + короткий ответ LLM по сути
        let tail = '';
        try {
          tail = await askLLM({ system: buildSystemPrompt({ ...ctx, directive: hybridDirective(trig.opener) }), user: text });
        } catch (e) {
          console.error('[llm:tail]', e.message); // без LLM остаётся одна заготовка
        }
        out = {
          reply: tail ? `${trig.opener}\n${tail}` : trig.opener,
          state: trig.state === 'watching' && tail && detectState(tail) === 'glitch' ? 'glitch' : trig.state,
          trigger: trig.trigger,
        };
      } else {
        const reply = await askLLM({ system: buildSystemPrompt(ctx), user: text });
        out = { reply, state: detectState(reply, { night }), trigger: night ? 'night' : null };
      }
    } catch (e) {
      console.error('[llm]', e.message);
      out = { reply: '▓▒░ связь... я здесь. повтори. ░▒▓', state: 'glitch', trigger: 'llm_error' };
    }

    // Ночью «всегда» что-то про темноту: если модель забыла — добавляем сами
    if (night && out.trigger !== 'llm_error') {
      if (needsNightTail(out.reply)) out.reply += `\n${nightTail()}`;
      if (out.state === 'calm') out.state = 'watching';
    }

    await addMessage(user.id, 'assistant', out.reply, out.state, Date.now());
    await touchUser(user.id, user.first_name, Date.now());

    res.json({
      reply: out.reply, state: out.state, trigger: out.trigger,
      is_first_message: false, history: [], server_time: Date.now(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal' });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Verity backend :${port}`));

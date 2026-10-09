import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { callChat } from './api';
import { Typewriter } from './Typewriter';
import type { ChatMessage, ChatRequest, VerityState } from './types';

interface Props {
  user: { id: number; first_name: string };
  initData: string;
  onState: (s: VerityState) => void;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clientInfo = () => ({
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  local_time: new Date().toISOString(),
});

export function Chat({ user, initData, onState }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false); // ждём ответ сервера
  const [typing, setTyping] = useState(false);   // ответ печатается на экране
  const [wake, setWake] = useState(false);       // сервер просыпается (бесплатный хостинг)
  const opened = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback(() => endRef.current?.scrollIntoView({ block: 'end' }), []);

  const request = useCallback(
    (kind: ChatRequest['kind'], message: string | null) =>
      callChat({ kind, message, init_data: initData, user, client: clientInfo() }, () => setWake(true)),
    [initData, user]
  );

  const pushAssistant = useCallback(
    (content: string, state: VerityState) => {
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content, timestamp: Date.now(), state, fresh: true }]);
      setTyping(true);
      onState(state);
    },
    [onState]
  );

  // Открытие: история + Верити может написать первой (приветствие / долгое отсутствие)
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    (async () => {
      setWaiting(true);
      try {
        const res = await request('open', null);
        setMessages(
          res.history.map((h) => ({ id: uid(), role: h.role, content: h.content, timestamp: h.timestamp, state: h.state ?? undefined }))
        );
        if (res.reply) {
          await sleep(res.is_first_message ? 1400 : 0); // пауза: «она ждала»
          pushAssistant(res.reply, res.state);
        }
      } catch {
        pushAssistant('▓▒░ связь потеряна. Но я всё ещё здесь. ░▒▓', 'glitch');
      } finally {
        setWaiting(false);
        setWake(false);
      }
    })();
  }, [request, pushAssistant]);

  useEffect(scroll, [messages, waiting, scroll]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || waiting || typing) return;
    setInput('');
    setMessages((m) => [...m, { id: uid(), role: 'user', content: text, timestamp: Date.now() }]);
    setWaiting(true);
    try {
      // искусственная пауза: ответ приходит «слишком быстро» — это неестественно
      const [res] = await Promise.all([request('message', text), sleep(600 + Math.random() * 900)]);
      pushAssistant(res.reply ?? '...', res.state);
    } catch {
      pushAssistant('▓▒░ связь прервана... не уходи ░▒▓', 'glitch');
    } finally {
      setWaiting(false);
      setWake(false);
    }
  }

  const finish = (id: string) => {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, fresh: false } : x)));
    setTyping(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const mine = m.role === 'user';
          const tone = mine
            ? 'border-crt-dim bg-crt-panel text-crt-green/80'
            : m.state === 'glitch'
              ? 'border-crt-red text-crt-red animate-glitch-text'
              : m.state === 'watching'
                ? 'border-crt-red/50 text-crt-green animate-flicker'
                : 'border-crt-green/40 text-crt-green';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap break-words border px-3 py-2 text-[15px] leading-snug ${tone}`}>
                {mine ? (
                  m.content
                ) : (
                  <Typewriter text={m.content} animate={Boolean(m.fresh)} onTick={scroll} onDone={() => finish(m.id)} />
                )}
              </div>
            </div>
          );
        })}
        {waiting && (
          <div className="text-sm text-crt-dim">
            {wake ? 'Верити просыпается... связь медленная' : 'Верити печатает'}
            <span className="cursor" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-crt-dim/50 bg-crt-bg p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="напиши ей..."
          maxLength={2000}
          autoComplete="off"
          className="min-w-0 flex-1 border border-crt-dim bg-crt-panel px-3 py-2 text-[16px] text-crt-green placeholder:text-crt-dim focus:border-crt-green focus:outline-none"
        />
        <button
          type="submit"
          disabled={waiting || typing || !input.trim()}
          className="border border-crt-green px-4 text-crt-green transition-colors enabled:active:bg-crt-green enabled:active:text-crt-bg disabled:border-crt-dim disabled:text-crt-dim"
          aria-label="Отправить"
        >
          ▶
        </button>
      </form>
    </div>
  );
}

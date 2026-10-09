export type VerityState = 'calm' | 'watching' | 'glitch';

/** POST /api/chat — запрос */
export interface ChatRequest {
  kind: 'open' | 'message';          // open — приложение только что открыто
  message: string | null;            // null для kind = 'open'
  init_data: string;                 // Telegram.WebApp.initData (бэкенд проверяет подпись)
  user: { id: number; first_name: string }; // только для DEV_BYPASS_AUTH=1
  client: { tz: string; local_time: string }; // IANA-пояс и ISO-время клиента
}

export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  state: VerityState | null;
}

/** POST /api/chat — ответ */
export interface ChatResponse {
  reply: string | null;              // null, если Верити нечего сказать первой
  state: VerityState;
  is_first_message: boolean;         // true — Верити пишет первой (приветствие / долгое отсутствие)
  trigger: 'welcome' | 'absence' | 'exit' | 'other_ai' | 'repeat' | 'night' | 'llm_error' | null;
  history: HistoryItem[];            // заполняется только для kind = 'open'
  server_time: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  state?: VerityState;
  fresh?: boolean;                   // true — ещё печатается посимвольно
}

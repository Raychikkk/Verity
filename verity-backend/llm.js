/**
 * Прокси к LLM. Провайдер выбирается переменной LLM_PROVIDER:
 *   gemini    — бесплатный тариф Google AI Studio (ключ: aistudio.google.com/apikey)
 *   openai    — OpenAI и любые OpenAI-совместимые API (Groq, OpenRouter): меняется OPENAI_BASE_URL
 *   anthropic — Claude API (платный)
 */
async function post(url, headers, body, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`LLM ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function ask({ system, user }) {
  const provider = process.env.LLM_PROVIDER || 'gemini';

  if (provider === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const data = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 1 },
      }
    );
    return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  }

  if (provider === 'openai') {
    const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const data = await post(
      `${base}/chat/completions`,
      { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 400,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }
    );
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'anthropic') {
    const data = await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: user }],
      }
    );
    return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}

/** Пустой ответ (например, сработал фильтр безопасности) считаем ошибкой */
export async function askLLM(args) {
  const text = (await ask(args)).trim();
  if (!text) throw new Error('LLM returned empty text');
  return text;
}

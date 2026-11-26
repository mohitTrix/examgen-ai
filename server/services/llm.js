// Works with any OpenAI-compatible /chat/completions endpoint.
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function parseJson(content) {
  const cleaned = String(content).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, 'The AI returned a response that was not valid JSON. Please try again.');
  }
}

export async function completeJson(system, user, { fetchImpl = fetch, retryDelay = 1500 } = {}) {
  const body = {
    model: env.ai.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...(env.ai.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchImpl(`${env.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ai.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.ai.timeoutMs),
      });
    } catch (e) {
      throw new HttpError(502, e.name === 'TimeoutError' ? 'The AI service timed out. Try fewer questions.' : 'Could not reach the AI service.');
    }
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new HttpError(502, 'The AI service returned an empty response.');
      return parseJson(content);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
      continue;
    }
    console.error('AI request failed', res.status, (await res.text().catch(() => '')).slice(0, 500));
    const why =
      res.status === 401 || res.status === 403
        ? 'The AI API key was rejected.'
        : res.status === 429
          ? 'The AI service rate limit or quota was reached.'
          : `The AI service returned an error (${res.status}).`;
    throw new HttpError(502, why);
  }
}

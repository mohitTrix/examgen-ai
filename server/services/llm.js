
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function parseJson(content) {
  const cleaned = String(content)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new HttpError(
      502,
      'The AI returned invalid JSON. Please try again.'
    );
  }
}

const transient = (status) => status === 429 || status >= 500;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function completeJson(
  system,
  user,
  {
    fetchImpl = fetch,
    retryDelay = 1500,
    maxRetries = 2,
  } = {}
) {
  const models = [
    ...new Set([
      env.ai.model,
      ...(env.ai.fallbackModels || []),
    ].filter(Boolean)),
  ];

  if (!env.ai.apiKey || !models.length) {
    throw new HttpError(
      503,
      'Gemini AI is not configured. Check your environment variables.'
    );
  }

  let lastStatus = 0;
  let lastMessage = '';

  for (const model of models) {
    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(env.ai.jsonMode
        ? { response_format: { type: 'json_object' } }
        : {}),
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res;

      try {
        res = await fetchImpl(
          `${env.ai.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.ai.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(env.ai.timeoutMs),
          }
        );
      } catch (error) {
        if (attempt < maxRetries) {
          await sleep(retryDelay * (attempt + 1));
          continue;
        }

        lastMessage =
          error?.name === 'TimeoutError'
            ? 'Gemini AI request timed out.'
            : 'Could not connect to Gemini AI.';

        break;
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
          throw new HttpError(
            502,
            'Gemini returned an empty response.'
          );
        }

        return parseJson(content);
      }

      lastStatus = res.status;

      console.warn(
        `AI request failed with status ${res.status} for model ${model}`
      );

      if (res.status === 401 || res.status === 403) {
        throw new HttpError(
          502,
          'Gemini API key rejected. Check your API key.'
        );
      }

      if (transient(res.status) && attempt < maxRetries) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }

      lastMessage =
        res.status === 429
          ? 'Gemini API quota or rate limit reached.'
          : `Gemini API returned error ${res.status}.`;

      break;
    }
  }

  if (lastStatus === 429) {
    throw new HttpError(
      503,
      'Gemini is busy or your API quota is limited. Please try again later.'
    );
  }

  if (lastStatus >= 500) {
    throw new HttpError(
      503,
      'Gemini is temporarily unavailable. Please try again later.'
    );
  }

  throw new HttpError(
    502,
    lastMessage || 'Gemini AI request failed.'
  );
}

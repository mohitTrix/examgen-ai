
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

export async function completeJson(
  system,
  user,
  { fetchImpl = fetch, retryDelay = 2000 } = {}
) {
  const body = {
    model: env.ai.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...(env.ai.jsonMode
      ? { response_format: { type: 'json_object' } }
      : {}),
  };

  const maxRetries = 2;

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
      if (
        error.name === 'TimeoutError' ||
        error.name === 'AbortError'
      ) {
        throw new HttpError(
          504,
          'The AI service timed out. Please try again.'
        );
      }

      console.error('AI network error:', error.message);

      throw new HttpError(
        502,
        'Could not reach the AI service.'
      );
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new HttpError(
          502,
          'The AI service returned an empty response.'
        );
      }

      return parseJson(content);
    }

    const errorText = await res.text().catch(() => '');

    console.error('AI request failed:', {
      status: res.status,
      attempt,
      details: errorText.slice(0, 500),
    });

    // Never retry quota errors blindly.
    if (res.status === 429) {
      const dailyQuota =
        /per.day|daily|requests per day|free_tier_requests/i.test(
          errorText
        );

      throw new HttpError(
        429,
        dailyQuota
          ? 'Gemini daily quota exhausted. Please try after quota reset.'
          : 'AI rate limit reached. Please wait before trying again.'
      );
    }

    // Retry temporary server failures.
    if (res.status >= 500 && attempt < maxRetries) {
      const delay = retryDelay * (2 ** attempt);

      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    throw new HttpError(
      res.status === 503 ? 503 : 502,
      `The AI service returned an error (${res.status}).`
    );
  }
}

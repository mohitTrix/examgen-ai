
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';


export function parseJson(content) {
  let cleaned = String(content || '').trim();

  // Remove Markdown code fences.
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Extract JSON if the model adds extra text around it.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('[AI] Invalid JSON response:', cleaned.slice(0, 1000));

    throw new HttpError(
      502,
      'The AI returned invalid JSON. Please try again.'
    );
  }
}

export async function completeJson(
  system,
  user,
  { fetchImpl = fetch } = {}
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
      'Gemini AI is not configured.'
    );
  }

  let lastError = '';

  for (const model of models) {
    try {
      console.log(`[AI] Trying model: ${model}`);

      const response = await fetchImpl(
        `${env.ai.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.ai.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            ...(env.ai.jsonMode
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
          signal: AbortSignal.timeout(env.ai.timeoutMs),
        }
      );

      if (!response.ok) {
        const status = response.status;

        console.warn(
          `[AI] Model ${model} returned status ${status}`
        );

        if (status === 401 || status === 403) {
          throw new HttpError(
            502,
            'Gemini API key rejected. Check your API key.'
          );
        }

        if (status === 400 || status === 404) {
          throw new HttpError(
            502,
            `Gemini model or request configuration is invalid (${status}).`
          );
        }

        lastError =
          status === 429
            ? 'Gemini rate limit reached.'
            : `Gemini returned error ${status}.`;

        // Try the backup model for temporary failures.
        if (status === 429 || status >= 500) {
          continue;
        }

        throw new HttpError(502, lastError);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new HttpError(
          502,
          'Gemini returned an empty response.'
        );
      }

      console.log(`[AI] Successfully generated response using ${model}`);

      return parseJson(content);

    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 502 && lastError) {
          throw error;
        }
        throw error;
      }

      lastError =
        error?.name === 'TimeoutError'
          ? `Model ${model} timed out.`
          : `Connection failed for model ${model}.`;

      console.warn(`[AI] ${lastError}`);

      // Move to the next configured model.
    }
  }

  throw new HttpError(
    503,
    `AI generation failed. ${lastError} Please try again.`
  );
}

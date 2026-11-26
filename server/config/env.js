const list = (v) => (v || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examgen',
  jwtSecret: process.env.JWT_SECRET || '',
  clientOrigins: list(process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.AI_MODEL || '',
    jsonMode: process.env.AI_JSON_MODE !== 'false',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 90000,
    contextChars: Number(process.env.AI_CONTEXT_CHARS) || 40000,
  },
  forceDemo: process.env.DEMO_MODE === 'true',
};
// Demo mode is used only when there is no key (or when explicitly requested).
// A failing real AI call is reported as an error; it never falls back to samples.
export const isDemo = () => env.forceDemo || !env.ai.apiKey;

export function assertEnv() {
  if (env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 random characters (see .env.example).');
  if (!isDemo() && !env.ai.model) throw new Error('AI_MODEL must be set when AI_API_KEY is provided.');
  if (isProd && !process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in production.');
}

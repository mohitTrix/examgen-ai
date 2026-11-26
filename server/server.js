import 'dotenv/config';
const { env, assertEnv, isDemo } = await import('./config/env.js');
const { connectDb } = await import('./config/db.js');
const { default: app } = await import('./app.js');

try {
  assertEnv();
  await connectDb();
  app.listen(env.port, () => console.log(`API on port ${env.port} (${isDemo() ? 'DEMO mode: sample questions' : `AI model: ${env.ai.model}`})`));
} catch (e) {
  console.error('Startup failed:', e.message);
  process.exit(1);
}

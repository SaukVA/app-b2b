import { buildApp } from './app';
import { getEnv } from './config/env';
import { connectDatabase } from './config/database';

async function start(): Promise<void> {
  const env = getEnv();
  await connectDatabase(env.MONGODB_URI);
  buildApp().listen(env.PORT, () => {
    console.log(`API escuchando en http://localhost:${env.PORT} (docs en /api-docs)`);
  });
}

start().catch((err: unknown) => {
  console.error('No se pudo arrancar el servidor:', err);
  process.exit(1);
});

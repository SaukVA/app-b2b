import { buildApp } from './app';
import { getEnv } from './config/env';
import { connectDatabase } from './config/database';
import { ensureBootstrapAccount } from './modules/auth/bootstrap.service';

async function start(): Promise<void> {
  const env = getEnv();
  // MONGODB_URI es opcional solo para el backend embebido de escritorio (embedded.ts); la web la exige.
  if (!env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  await connectDatabase(env.MONGODB_URI);
  await ensureBootstrapAccount();
  const onListening = () => {
    console.log(
      `API escuchando en http://${env.HOST ?? 'localhost'}:${env.PORT} (docs en /api-docs)`,
    );
  };
  const app = buildApp();
  if (env.HOST) app.listen(env.PORT, env.HOST, onListening);
  else app.listen(env.PORT, onListening);
}

start().catch((err: unknown) => {
  console.error('No se pudo arrancar el servidor:', err);
  process.exit(1);
});

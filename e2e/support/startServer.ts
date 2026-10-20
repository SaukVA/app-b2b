import { rmSync, writeFileSync } from 'node:fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { E2E_MONGO_URI_FILE } from './mongoUriFile';

// Servidor de la API para los tests E2E (ADR 0004): MongoDB en memoria, base de datos limpia en cada
// arranque y sin depender de Docker ni del .env de desarrollo.

export const E2E_API_PORT = 4100;

function setE2eEnv(mongoUri: string): void {
  process.env.NODE_ENV = 'test';
  process.env.PORT = String(E2E_API_PORT);
  process.env.MONGODB_URI = mongoUri;
  process.env.JWT_ACCESS_SECRET = 'e2e-secret-de-al-menos-treinta-y-dos-caracteres';
  process.env.CORS_ORIGINS = 'http://localhost:5180';
}

async function start(): Promise<void> {
  const mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri('wholesale-e2e');
  setE2eEnv(mongoUri);
  // Para los tests que siembran datos directamente en la base de datos (db.ts).
  writeFileSync(E2E_MONGO_URI_FILE, mongoUri);
  // Import dinámico: env.ts carga el .env al importarse y dotenv no pisa las variables ya definidas.
  await import('../../apps/server/src/server');
  const stop = () => {
    rmSync(E2E_MONGO_URI_FILE, { force: true });
    void mongo.stop().finally(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch((err: unknown) => {
  console.error('No se pudo arrancar el servidor E2E:', err);
  process.exit(1);
});

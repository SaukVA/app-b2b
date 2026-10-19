import { MongoMemoryServer } from 'mongodb-memory-server';

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
  setE2eEnv(mongo.getUri('wholesale-e2e'));
  // Import dinámico: env.ts carga el .env al importarse y dotenv no pisa las variables ya definidas.
  await import('../../apps/server/src/server');
  const stop = () => void mongo.stop().finally(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch((err: unknown) => {
  console.error('No se pudo arrancar el servidor E2E:', err);
  process.exit(1);
});

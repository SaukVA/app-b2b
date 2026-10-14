import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../config/database';

// Helper de tests: MongoDB en memoria, sin depender de una instancia externa.

let mongo: MongoMemoryServer | null = null;

/** Variables de entorno mínimas para que getEnv() valide en los tests. */
export function setTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.PORT ??= '4000';
  process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/test';
  process.env.JWT_ACCESS_SECRET ??= 'test-secret-de-al-menos-treinta-y-dos-caracteres';
  process.env.CORS_ORIGINS ??= 'http://localhost:5173,app://.';
}

export async function startTestDb(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
}

export async function clearTestDb(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopTestDb(): Promise<void> {
  await disconnectDatabase();
  await mongo?.stop();
  mongo = null;
}

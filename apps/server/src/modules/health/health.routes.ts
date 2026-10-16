import { Router } from 'express';
import mongoose from 'mongoose';
import type { ApiSuccess } from '@app/shared';

export const healthRouter = Router();

const PING_TIMEOUT_MS = 2000;
const CONNECTED = 1;

type DatabaseHealth = 'connected' | 'disconnected';

/** connected solo si la conexión está abierta y responde a un ping en menos de 2 s. */
async function databaseHealth(): Promise<DatabaseHealth> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== CONNECTED || !db) return 'disconnected';
  const timeout = new Promise<DatabaseHealth>((resolve) =>
    setTimeout(() => resolve('disconnected'), PING_TIMEOUT_MS).unref(),
  );
  const ping = db
    .admin()
    .ping()
    .then((): DatabaseHealth => 'connected')
    .catch((): DatabaseHealth => 'disconnected');
  return Promise.race([ping, timeout]);
}

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Estado del servidor y de su conexión con la base de datos
 *     security: []
 *     responses:
 *       '200':
 *         description: >
 *           El servidor responde. `database` indica si la conexión con la base de datos está activa
 *           (`readyState` conectado y `ping` correcto en menos de 2 s).
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       required: [status, database]
 *                       properties:
 *                         status: { type: string, enum: [ok] }
 *                         database: { type: string, enum: [connected, disconnected] }
 */
healthRouter.get('/', async (_req, res) => {
  const body: ApiSuccess<{ status: 'ok'; database: DatabaseHealth }> = {
    success: true,
    data: { status: 'ok', database: await databaseHealth() },
  };
  res.json(body);
});

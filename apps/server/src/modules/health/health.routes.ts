import { Router } from 'express';
import type { ApiSuccess } from '@app/shared';

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Estado del servidor (usado por el indicador de servidor en escritorio)
 *     security: []
 *     responses:
 *       '200':
 *         description: Servidor accesible
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       required: [status]
 *                       properties:
 *                         status: { type: string, enum: [ok] }
 */
healthRouter.get('/', (_req, res) => {
  const body: ApiSuccess<{ status: 'ok' }> = { success: true, data: { status: 'ok' } };
  res.json(body);
});

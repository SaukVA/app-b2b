import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';
import { validate } from '../../middlewares/validate';
import { customerController } from './customer.controller';
import { customerListQuerySchema } from './customer.validation';

export const customerRouter = Router();

// Todo el módulo exige sesión y permiso de ver Clientes; editar incluye ver (FR-002, FR-008).
customerRouter.use(requireAuth, requirePermission('clientes', 'view'));

/**
 * @openapi
 * tags:
 *   - name: Customers
 * components:
 *   schemas:
 *     CustomerListItem:
 *       type: object
 *       required: [id, name, city, maxRisk, balance, riskUsed, lastOrderDate]
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         city: { type: string, nullable: true }
 *         maxRisk:
 *           type: number
 *           nullable: true
 *           description: Riesgo máximo en euros con 2 decimales; null o 0 = sin límite.
 *         balance: { type: number, description: Saldo pendiente en euros con 2 decimales }
 *         riskUsed:
 *           type: integer
 *           minimum: 0
 *           nullable: true
 *           description: >
 *             Porcentaje del riesgo máximo usado por el saldo pendiente, redondeado (puede pasar de 100).
 *             null cuando el cliente no tiene límite.
 *         lastOrderDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Fecha del último pedido (YYYY-MM-DD); null si no hay pedidos.
 *     CustomerListPage:
 *       type: object
 *       required: [items, total, page, pageSize]
 *       properties:
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/CustomerListItem' }
 *         total: { type: integer, minimum: 0 }
 *         page: { type: integer, minimum: 1 }
 *         pageSize: { type: integer, enum: [10] }
 */

/**
 * @openapi
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: Lista los clientes con búsqueda y paginación
 *     description: >
 *       Ordenado por nombre. Campos provisionales hasta cerrar la migración (FR-009); la forma de la
 *       respuesta ya es la definitiva (FR-010). Los parámetros desconocidos se ignoran.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Texto de búsqueda (nombre o población). Se recorta; vacío equivale a ausente.
 *         schema: { type: string, maxLength: 100 }
 *       - name: page
 *         in: query
 *         schema: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       '200':
 *         description: Página del listado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/CustomerListPage' }
 *             example:
 *               success: true
 *               data: { items: [], total: 0, page: 1, pageSize: 10 }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403':
 *         description: AUTH_FORBIDDEN (el rol no puede ver Clientes)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
customerRouter.get('/', validate({ query: customerListQuerySchema }), customerController.list);

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';
import { validate } from '../../middlewares/validate';
import { supplierController } from './supplier.controller';
import { supplierListQuerySchema } from './supplier.validation';

export const supplierRouter = Router();

// Todo el módulo exige sesión y permiso de ver Proveedores; editar incluye ver (FR-002, FR-008).
supplierRouter.use(requireAuth, requirePermission('proveedores', 'view'));

/**
 * @openapi
 * tags:
 *   - name: Suppliers
 * components:
 *   schemas:
 *     SupplierListItem:
 *       type: object
 *       required: [id, name, leadTimeDays, yearPurchases, active]
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         leadTimeDays:
 *           type: integer
 *           minimum: 0
 *           nullable: true
 *           description: Plazo de entrega en días naturales; null si no se conoce.
 *         yearPurchases:
 *           type: number
 *           description: Compras sin IVA en euros con 2 decimales, del 1 de enero del año en curso hasta hoy.
 *         active:
 *           type: boolean
 *           description: false si el proveedor está dado de baja.
 *     SupplierListPage:
 *       type: object
 *       required: [items, total, page, pageSize]
 *       properties:
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/SupplierListItem' }
 *         total: { type: integer, minimum: 0 }
 *         page: { type: integer, minimum: 1 }
 *         pageSize: { type: integer, enum: [10] }
 */

/**
 * @openapi
 * /suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Lista los proveedores con búsqueda, filtro de bajas y paginación
 *     description: >
 *       Ordenado por nombre. Campos provisionales hasta cerrar la migración (FR-009); la forma de la
 *       respuesta ya es la definitiva (FR-010). Los parámetros desconocidos se ignoran.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Texto de búsqueda (nombre o CIF). Se recorta; vacío equivale a ausente.
 *         schema: { type: string, maxLength: 100 }
 *       - name: includeInactive
 *         in: query
 *         description: >
 *           true incluye también los proveedores dados de baja; false (por defecto), solo los activos.
 *           total cuenta los proveedores incluidos.
 *         schema: { type: string, enum: ['true', 'false'], default: 'false' }
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
 *                     data: { $ref: '#/components/schemas/SupplierListPage' }
 *             example:
 *               success: true
 *               data: { items: [], total: 0, page: 1, pageSize: 10 }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403':
 *         description: AUTH_FORBIDDEN (el rol no puede ver Proveedores)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
supplierRouter.get('/', validate({ query: supplierListQuerySchema }), supplierController.list);

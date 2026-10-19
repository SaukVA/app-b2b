import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';
import { roleController } from './role.controller';

export const roleRouter = Router();

/**
 * @openapi
 * components:
 *   responses:
 *     Forbidden:
 *       description: AUTH_FORBIDDEN (el rol no tiene permiso de edición en Ajustes)
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *   schemas:
 *     Role:
 *       type: string
 *       minLength: 1
 *       description: >
 *         Clave de un rol guardado en la base de datos. Iniciales: Administrador, Comercial, Almacén,
 *         Administración; puede haber más en el futuro.
 *       example: Comercial
 *     PermissionLevel:
 *       type: string
 *       enum: [edit, view, none]
 *     PermissionSet:
 *       type: object
 *       description: Nivel por módulo; siempre incluye los 6 módulos de la aplicación.
 *       required: [ventas, clientes, productos, proveedores, cobros, ajustes]
 *       properties:
 *         ventas: { $ref: '#/components/schemas/PermissionLevel' }
 *         clientes: { $ref: '#/components/schemas/PermissionLevel' }
 *         productos: { $ref: '#/components/schemas/PermissionLevel' }
 *         proveedores: { $ref: '#/components/schemas/PermissionLevel' }
 *         cobros: { $ref: '#/components/schemas/PermissionLevel' }
 *         ajustes: { $ref: '#/components/schemas/PermissionLevel' }
 *     RoleSummary:
 *       type: object
 *       required: [key, name, isAdmin, order, permissions]
 *       properties:
 *         key: { $ref: '#/components/schemas/Role' }
 *         name: { type: string }
 *         isAdmin: { type: boolean, description: true solo en el rol Administrador del sistema }
 *         order: { type: number }
 *         permissions: { $ref: '#/components/schemas/PermissionSet' }
 */

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: Roles guardados con su fila de la matriz de permisos, ordenados por order (solo lectura)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Roles y matriz
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/RoleSummary' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 */
roleRouter.get('/', requireAuth, requirePermission('ajustes', 'edit'), roleController.list);

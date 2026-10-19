import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';

export const userRouter = Router();

// Todas las rutas de gestión de usuarios exigen sesión y permiso de edición en Ajustes (FR-001, FR-002).
userRouter.use(requireAuth, requirePermission('ajustes', 'edit'));

/**
 * @openapi
 * tags:
 *   - name: Users
 *   - name: Roles
 * components:
 *   parameters:
 *     UserId:
 *       name: id
 *       in: path
 *       required: true
 *       schema: { type: string, pattern: '^[a-f0-9]{24}$' }
 *   responses:
 *     ValidationOrRoleError:
 *       description: VALIDATION_ERROR | USER_ROLE_NOT_FOUND (la clave de rol no existe en la base de datos)
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *     UserNotFound:
 *       description: USER_NOT_FOUND (no existe o es la cuenta inicial)
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *   schemas:
 *     UserStatus:
 *       type: string
 *       enum: [Activo, Bloqueado]
 *     UserSummary:
 *       type: object
 *       required: [id, name, email, role, roleName, status, lastLoginAt]
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         role: { $ref: '#/components/schemas/Role' }
 *         roleName: { type: string }
 *         status: { $ref: '#/components/schemas/UserStatus' }
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: null si nunca ha iniciado sesión ("Nunca" en la interfaz)
 */

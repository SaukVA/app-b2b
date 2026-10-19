import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';
import { validate } from '../../middlewares/validate';
import { userController } from './user.controller';
import { createUserSchema } from './user.validation';

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
 *     CreateUserRequest:
 *       type: object
 *       required: [name, email, role, password]
 *       properties:
 *         name: { type: string, minLength: 1, maxLength: 100 }
 *         email:
 *           type: string
 *           format: email
 *           description: Se normaliza a minúsculas y sin espacios; único sin distinguir mayúsculas.
 *         role: { $ref: '#/components/schemas/Role' }
 *         password: { type: string, minLength: 8 }
 *     CreateUserResponse:
 *       type: object
 *       required: [user, bootstrapRetired]
 *       properties:
 *         user: { $ref: '#/components/schemas/UserSummary' }
 *         bootstrapRetired: { type: boolean }
 */

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Da de alta un usuario Activo (el primero tiene que ser Administrador)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateUserRequest' }
 *     responses:
 *       '201':
 *         description: >
 *           Usuario creado. Si era el primer usuario real, bootstrapRetired=true: la cuenta inicial se ha
 *           borrado y sus sesiones (incluida la que hizo la petición) ya no valen.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/CreateUserResponse' }
 *       '400': { $ref: '#/components/responses/ValidationOrRoleError' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403': { $ref: '#/components/responses/Forbidden' }
 *       '409':
 *         description: USER_EMAIL_TAKEN | USER_FIRST_MUST_BE_ADMIN
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *             example:
 *               success: false
 *               error: { code: USER_EMAIL_TAKEN, message: 'Ya existe un usuario con ese email.' }
 */
userRouter.post('/', validate({ body: createUserSchema }), userController.create);

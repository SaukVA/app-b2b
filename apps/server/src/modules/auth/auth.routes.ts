import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { validate } from '../../middlewares/validate';
import { authController } from './auth.controller';
import { loginSchema, refreshSchema } from './auth.validation';

export const authRouter = Router();

/**
 * @openapi
 * components:
 *   responses:
 *     ValidationError:
 *       description: VALIDATION_ERROR (payload no válido según el esquema zod)
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *     Unauthenticated:
 *       description: AUTH_UNAUTHENTICATED | AUTH_SESSION_EXPIRED
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [login, password, persistent, client]
 *       properties:
 *         login:
 *           type: string
 *           description: Email (se normaliza a minúsculas y sin espacios) o "admin" para la cuenta inicial.
 *           example: comercial@empresa.es
 *         password: { type: string, minLength: 1 }
 *         persistent: { type: boolean, description: Mantener la sesión iniciada en este equipo }
 *         client: { type: string, enum: [web, desktop] }
 *     AuthUser:
 *       type: object
 *       required: [id, login, name, role, isBootstrap, homeScreen]
 *       properties:
 *         id: { type: string }
 *         login: { type: string }
 *         name: { type: string }
 *         role: { type: string, enum: [Administrador, Comercial, Almacén, Administración] }
 *         isBootstrap: { type: boolean }
 *         homeScreen: { type: string, nullable: true, enum: [panel, ventas, productos] }
 *     LoginResponse:
 *       type: object
 *       required: [accessToken, user]
 *       properties:
 *         accessToken: { type: string, description: JWT de 15 min }
 *         refreshToken: { type: string, description: Solo con client=desktop }
 *         user: { $ref: '#/components/schemas/AuthUser' }
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión con email (o "admin") y contraseña
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       '200':
 *         description: >
 *           Sesión creada. En web el refresh token se envía en la cookie httpOnly `refreshToken`
 *           (Path=/api/auth); en escritorio va en el cuerpo.
 *         headers:
 *           Set-Cookie:
 *             description: Solo con client=web.
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/LoginResponse' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401':
 *         description: >
 *           AUTH_INVALID_CREDENTIALS. El mensaje incluye los intentos restantes y es idéntico tanto si
 *           el email existe como si no.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *             example:
 *               success: false
 *               error: { code: AUTH_INVALID_CREDENTIALS, message: 'Email o contraseña incorrectos. Te quedan 3 intentos.' }
 *       '403':
 *         description: AUTH_ACCOUNT_BLOCKED | AUTH_INVITATION_PENDING (solo con contraseña correcta)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       '423':
 *         description: AUTH_ACCOUNT_LOCKED. El mensaje indica la hora a partir de la que se puede reintentar.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
authRouter.post('/login', validate({ body: loginSchema }), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rota el refresh token y emite un nuevo access token
 *     security: []
 *     requestBody:
 *       description: Solo escritorio. En web el token se lee de la cookie `refreshToken`.
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       '200':
 *         description: Tokens renovados (nuevo refresh en la cookie o en el cuerpo, según el cliente)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/LoginResponse' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401':
 *         description: AUTH_SESSION_EXPIRED (caducada, revocada, reutilizada o usuario no activo)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
authRouter.post('/refresh', validate({ body: refreshSchema }), authController.refresh);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Usuario de la sesión actual y sus permisos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200':
 *         description: Usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/AuthUser' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 */
authRouter.get('/me', requireAuth, authController.me);

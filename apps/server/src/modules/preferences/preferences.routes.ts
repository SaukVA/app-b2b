import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { validate } from '../../middlewares/validate';
import { preferencesController } from './preferences.controller';
import { updatePreferencesSchema } from './preferences.validation';

export const preferencesRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ThemePreference:
 *       type: string
 *       enum: [light, dark, system]
 *       description: Claro, Oscuro o Según el sistema.
 *     TableDensity:
 *       type: string
 *       enum: [comfortable, compact]
 *       description: Cómoda o Compacta.
 *     MoneyFormat:
 *       type: string
 *       enum: [es, en]
 *       description: 'es = "1.248,50 €"; en = "€ 1,248.50".'
 *     HomeScreen:
 *       type: string
 *       enum: [panel, ventas, clientes, productos, proveedores, cobros]
 *     AppearancePreferences:
 *       type: object
 *       required: [theme, tableDensity, moneyFormat, homeScreen]
 *       properties:
 *         theme: { $ref: '#/components/schemas/ThemePreference' }
 *         tableDensity: { $ref: '#/components/schemas/TableDensity' }
 *         moneyFormat: { $ref: '#/components/schemas/MoneyFormat' }
 *         homeScreen:
 *           allOf:
 *             - $ref: '#/components/schemas/HomeScreen'
 *           nullable: true
 *           description: null = sin elegir; el cliente usa la pantalla por defecto efectiva.
 *     UpdatePreferencesRequest:
 *       type: object
 *       minProperties: 1
 *       additionalProperties: false
 *       properties:
 *         theme:
 *           allOf:
 *             - $ref: '#/components/schemas/ThemePreference'
 *           nullable: true
 *         tableDensity:
 *           allOf:
 *             - $ref: '#/components/schemas/TableDensity'
 *           nullable: true
 *         moneyFormat:
 *           allOf:
 *             - $ref: '#/components/schemas/MoneyFormat'
 *           nullable: true
 *         homeScreen:
 *           allOf:
 *             - $ref: '#/components/schemas/HomeScreen'
 *           nullable: true
 */

/**
 * @openapi
 * /preferences:
 *   patch:
 *     tags: [Preferences]
 *     summary: Cambia una o varias preferencias del usuario de la sesión
 *     description: >
 *       Cuerpo parcial: solo se cambian los campos enviados. null vuelve al valor por defecto. Exige
 *       sesión pero ningún permiso de módulo: cualquier rol, incluida la cuenta inicial "admin". Responde
 *       con las preferencias guardadas, ya resueltas con sus valores por defecto.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdatePreferencesRequest' }
 *     responses:
 *       '200':
 *         description: Preferencias guardadas
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/AppearancePreferences' }
 *       '400':
 *         description: >
 *           VALIDATION_ERROR (cuerpo vacío o valor fuera del enum) | PREFERENCES_HOME_SCREEN_NOT_ALLOWED (la
 *           pantalla no existe todavía en la aplicación o el rol no tiene acceso a ella)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 */
preferencesRouter.patch(
  '/',
  requireAuth,
  validate({ body: updatePreferencesSchema }),
  preferencesController.update,
);

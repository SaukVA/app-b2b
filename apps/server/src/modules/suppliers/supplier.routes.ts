import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';
import { validate } from '../../middlewares/validate';
import { supplierController } from './supplier.controller';
import {
  supplierIdParams,
  supplierInputSchema,
  supplierListQuerySchema,
} from './supplier.validation';

export const supplierRouter = Router();

// Todo el módulo exige sesión y permiso de ver Proveedores; editar incluye ver (FR-002, FR-008).
supplierRouter.use(requireAuth, requirePermission('proveedores', 'view'));

/**
 * @openapi
 * tags:
 *   - name: Suppliers
 * components:
 *   parameters:
 *     SupplierId:
 *       name: id
 *       in: path
 *       required: true
 *       schema: { type: string, pattern: '^[a-f0-9]{24}$' }
 *   responses:
 *     SupplierCifTaken:
 *       description: SUPPLIER_CIF_TAKEN (activo o dado de baja; el mensaje incluye su nombre)
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *     SupplierNotFound:
 *       description: SUPPLIER_NOT_FOUND
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *   schemas:
 *     SupplierContact:
 *       type: object
 *       required: [label, value]
 *       properties:
 *         label: { type: string, maxLength: 40, nullable: true }
 *         value: { type: string }
 *     AuditUser:
 *       type: object
 *       required: [id, login]
 *       properties:
 *         id: { type: string }
 *         login: { type: string }
 *     SupplierInput:
 *       type: object
 *       required: [name, cif, foreign, address, postalCode, city, contactPerson, phones, emails,
 *         paymentMethod, iban, web, leadTimeDays, minOrder, notes]
 *       properties:
 *         name: { type: string, minLength: 1, maxLength: 120 }
 *         cif:
 *           type: string
 *           description: Se normaliza. NIF/CIF español válido salvo foreign; extranjero 3–20 letras y números.
 *         foreign: { type: boolean }
 *         address: { type: string, minLength: 1, maxLength: 200 }
 *         postalCode:
 *           type: string
 *           description: 5 cifras si es español; 3–10 caracteres si es extranjero.
 *         city: { type: string, minLength: 1, maxLength: 100 }
 *         contactPerson: { type: string, maxLength: 120, nullable: true }
 *         phones:
 *           type: array
 *           maxItems: 5
 *           items: { $ref: '#/components/schemas/SupplierContact' }
 *         emails:
 *           type: array
 *           maxItems: 5
 *           items: { $ref: '#/components/schemas/SupplierContact' }
 *         paymentMethod:
 *           type: string
 *           enum: [TRANSFER_30, TRANSFER_60, DIRECT_DEBIT, PROMISSORY_NOTE, CASH]
 *         iban: { type: string, nullable: true, description: IBAN válido; se guarda sin espacios. }
 *         web: { type: string, nullable: true, description: Sin protocolo se guarda con https://. }
 *         leadTimeDays: { type: integer, minimum: 0, maximum: 365, nullable: true }
 *         minOrder:
 *           type: number
 *           exclusiveMinimum: true
 *           minimum: 0
 *           nullable: true
 *           description: Euros, 2 decimales; null = sin pedido mínimo.
 *         notes: { type: string, maxLength: 2000, nullable: true }
 *     SupplierDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/SupplierInput'
 *         - type: object
 *           required: [id, active, version, yearPurchases, quarterPurchases, createdBy, createdAt,
 *             updatedBy, updatedAt]
 *           properties:
 *             id: { type: string }
 *             active: { type: boolean }
 *             version: { type: integer, minimum: 0 }
 *             yearPurchases: { type: number, description: Sin IVA, año en curso. }
 *             quarterPurchases:
 *               type: array
 *               minItems: 4
 *               maxItems: 4
 *               items: { type: number }
 *               description: Sin IVA, 1T a 4T del año en curso; suman yearPurchases.
 *             createdBy: { $ref: '#/components/schemas/AuditUser' }
 *             createdAt: { type: string, format: date-time }
 *             updatedBy: { $ref: '#/components/schemas/AuditUser' }
 *             updatedAt: { type: string, format: date-time }
 *     SupplierListItem:
 *       type: object
 *       required: [id, name, cif, city, leadTimeDays, quarterPurchases, yearPurchases, active]
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         cif: { type: string, description: 'Normalizado: mayúsculas, sin espacios, puntos ni guiones.' }
 *         city: { type: string }
 *         quarterPurchases:
 *           type: number
 *           description: Compras sin IVA en euros del trimestre pedido en quarter (0 hasta el módulo de compras).
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
 *     summary: Lista los proveedores con búsqueda, filtro de bajas, trimestre y paginación
 *     description: >
 *       Orden alfabético por nombre, sin distinguir mayúsculas ni acentos. Las compras valen 0 hasta que
 *       exista el módulo de compras (FR-021). Los parámetros desconocidos se ignoran.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: q
 *         in: query
 *         description: >
 *           Texto de búsqueda. Se recorta; vacío equivale a ausente. Busca en el nombre (sin distinguir
 *           mayúsculas ni acentos) y en el CIF normalizado.
 *         schema: { type: string, maxLength: 100 }
 *       - name: includeInactive
 *         in: query
 *         description: >
 *           true incluye también los proveedores dados de baja; false (por defecto), solo los activos.
 *           total cuenta los proveedores incluidos.
 *         schema: { type: string, enum: ['true', 'false'], default: 'false' }
 *       - name: quarter
 *         in: query
 *         description: Trimestre del año en curso para quarterPurchases. Por defecto, el trimestre en curso.
 *         schema: { type: integer, enum: [1, 2, 3, 4] }
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

/**
 * @openapi
 * /suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Ficha de un proveedor (activo o dado de baja)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/SupplierId'
 *     responses:
 *       '200':
 *         description: Ficha
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/SupplierDetail' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403':
 *         description: AUTH_FORBIDDEN (el rol no puede ver Proveedores)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       '404': { $ref: '#/components/responses/SupplierNotFound' }
 */
supplierRouter.get('/:id', validate({ params: supplierIdParams }), supplierController.get);

/**
 * @openapi
 * /suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Da de alta un proveedor (activo)
 *     description: >
 *       Exige permiso de editar Proveedores. El CIF se normaliza y es único entre activos y dados de baja;
 *       la web sin protocolo se guarda con https://; las filas de contacto sin valor se descartan.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SupplierInput' }
 *     responses:
 *       '201':
 *         description: Creado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/SupplierDetail' }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403':
 *         description: AUTH_FORBIDDEN (el rol no puede editar Proveedores)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 *       '409': { $ref: '#/components/responses/SupplierCifTaken' }
 */
supplierRouter.post(
  '/',
  requirePermission('proveedores', 'edit'),
  validate({ body: supplierInputSchema }),
  supplierController.create,
);

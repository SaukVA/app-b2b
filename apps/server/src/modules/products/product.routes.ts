import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePermission } from '../../middlewares/requirePermission';
import { validate } from '../../middlewares/validate';
import { productController } from './product.controller';
import { productListQuerySchema } from './product.validation';

export const productRouter = Router();

// Todo el módulo exige sesión y permiso de ver Productos; editar incluye ver (FR-002, FR-009).
productRouter.use(requireAuth, requirePermission('productos', 'view'));

/**
 * @openapi
 * tags:
 *   - name: Products
 * components:
 *   schemas:
 *     FilterId:
 *       type: string
 *       pattern: '^[A-Za-z0-9_-]{1,64}$'
 *       description: Identificador opaco; las opciones saldrán de los datos migrados.
 *     ProductStatus:
 *       type: string
 *       enum: [Disponible, Stock bajo, Sin stock]
 *       description: Sin stock si stock = 0; Stock bajo si 0 < stock < minStock; Disponible en el resto.
 *     ProductListItem:
 *       type: object
 *       required: [id, code, name, supplierName, category, subcategory, stock, minStock, price, status]
 *       properties:
 *         id: { type: string }
 *         code: { type: string }
 *         name: { type: string }
 *         supplierName: { type: string, nullable: true }
 *         category: { type: string }
 *         subcategory: { type: string, nullable: true }
 *         stock: { type: integer, minimum: 0 }
 *         minStock: { type: integer, minimum: 0 }
 *         price: { type: number, description: Euros con 2 decimales }
 *         status: { $ref: '#/components/schemas/ProductStatus' }
 *     ProductListPage:
 *       type: object
 *       required: [items, total, page, pageSize]
 *       properties:
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/ProductListItem' }
 *         total: { type: integer, minimum: 0 }
 *         page: { type: integer, minimum: 1 }
 *         pageSize: { type: integer, enum: [10] }
 */

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Lista los productos del catálogo con búsqueda, filtros y paginación
 *     description: >
 *       Provisional: devuelve siempre items vacío y total 0 sin leer la base de datos (FR-010); la forma de
 *       la respuesta ya es la definitiva (FR-011). Un identificador de filtro bien formado que no corresponde
 *       a ningún dato no es un error. Los parámetros desconocidos se ignoran.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Texto de búsqueda (código o nombre). Se recorta; vacío equivale a ausente.
 *         schema: { type: string, maxLength: 100 }
 *       - name: category
 *         in: query
 *         schema: { $ref: '#/components/schemas/FilterId' }
 *       - name: subcategory
 *         in: query
 *         schema: { $ref: '#/components/schemas/FilterId' }
 *       - name: supplier
 *         in: query
 *         schema: { $ref: '#/components/schemas/FilterId' }
 *       - name: lowStock
 *         in: query
 *         description: Solo productos en estado «Stock bajo» o «Sin stock».
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
 *                     data: { $ref: '#/components/schemas/ProductListPage' }
 *             example:
 *               success: true
 *               data: { items: [], total: 0, page: 1, pageSize: 10 }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/Unauthenticated' }
 *       '403':
 *         description: AUTH_FORBIDDEN (el rol no puede ver Productos)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorEnvelope' }
 */
productRouter.get('/', validate({ query: productListQuerySchema }), productController.list);

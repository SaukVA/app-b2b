import { z } from 'zod';
import { PRODUCT_FILTER_ID_PATTERN, PRODUCT_SEARCH_MAX_LENGTH } from '@app/shared';

// contracts/products-api.openapi.yaml › GET /products. Sin .strict(): los parámetros desconocidos se
// descartan. Un identificador bien formado que no existe no es un error (FR-009).

const filterId = z.string().regex(PRODUCT_FILTER_ID_PATTERN).optional();

export const productListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(PRODUCT_SEARCH_MAX_LENGTH)
    .transform((value) => value || undefined)
    .optional(),
  category: filterId,
  subcategory: filterId,
  supplier: filterId,
  lowStock: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
});

export type ProductListQueryInput = z.infer<typeof productListQuerySchema>;

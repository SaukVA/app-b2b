import { z } from 'zod';
import { SUPPLIER_SEARCH_MAX_LENGTH } from '@app/shared';

// contracts/suppliers-api.openapi.yaml › GET /suppliers. Sin .strict(): los parámetros desconocidos se
// descartan. includeInactive sigue el patrón de lowStock en Productos: solo 'true' o 'false'.

export const supplierListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(SUPPLIER_SEARCH_MAX_LENGTH)
    .transform((value) => value || undefined)
    .optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
});

export type SupplierListQueryInput = z.infer<typeof supplierListQuerySchema>;

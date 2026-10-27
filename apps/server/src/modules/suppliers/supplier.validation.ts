import { z } from 'zod';
import { currentQuarter, SUPPLIER_SEARCH_MAX_LENGTH, type Quarter } from '@app/shared';

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
  // El trimestre por defecto se calcula en cada petición, nunca al cargar el módulo (research R4).
  quarter: z.coerce
    .number()
    .int()
    .min(1)
    .max(4)
    .default(() => currentQuarter(new Date()))
    .transform((value) => value as Quarter),
  page: z.coerce.number().int().min(1).default(1),
});

export type SupplierListQueryInput = z.infer<typeof supplierListQuerySchema>;

export const supplierIdParams = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) });

export type SupplierIdParams = z.infer<typeof supplierIdParams>;

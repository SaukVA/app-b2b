import { z } from 'zod';
import { CUSTOMER_SEARCH_MAX_LENGTH } from '@app/shared';

// contracts/customers-api.openapi.yaml › GET /customers. Sin .strict(): los parámetros desconocidos se
// descartan.

export const customerListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(CUSTOMER_SEARCH_MAX_LENGTH)
    .transform((value) => value || undefined)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type CustomerListQueryInput = z.infer<typeof customerListQuerySchema>;

import { z } from 'zod';

// contracts/preferences-api.openapi.yaml › UpdatePreferencesRequest: parcial, al menos un campo y sin
// campos extra. `null` vuelve al valor por defecto.

const theme = z.enum(['light', 'dark', 'system']).nullable();
const tableDensity = z.enum(['comfortable', 'compact']).nullable();
const moneyFormat = z.enum(['es', 'en']).nullable();
const homeScreen = z
  .enum(['panel', 'ventas', 'clientes', 'productos', 'proveedores', 'cobros'])
  .nullable();

export const updatePreferencesSchema = z
  .object({
    theme: theme.optional(),
    tableDensity: tableDensity.optional(),
    moneyFormat: moneyFormat.optional(),
    homeScreen: homeScreen.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Indica al menos una preferencia: theme, tableDensity, moneyFormat o homeScreen',
  });

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

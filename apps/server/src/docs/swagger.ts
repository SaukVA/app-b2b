import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';

// Los bloques @openapi viven junto a cada ruta; en dist/ los archivos son .js.
const routesGlob = path.join(__dirname, '../modules/**/*.routes.{ts,js}').replace(/\\/g, '/');

const envelopeSchemas = {
  SuccessEnvelope: {
    type: 'object',
    required: ['success', 'data'],
    properties: { success: { type: 'boolean', enum: [true] }, data: {} },
  },
  ErrorEnvelope: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: { type: 'boolean', enum: [false] },
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: { code: { type: 'string' }, message: { type: 'string' } },
      },
    },
  },
};

export function buildSwaggerSpec(): object {
  return swaggerJsdoc({
    definition: {
      openapi: '3.0.3',
      info: { title: 'App B2B · API', version: '1.0.0' },
      servers: [{ url: '/api' }],
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
        schemas: envelopeSchemas,
      },
    },
    apis: [routesGlob],
  });
}

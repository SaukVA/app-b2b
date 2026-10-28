// Entorno de Jest de apps/client: jsdom con las clases de fetch de Node.
// El router de datos de react-router 7 (createMemoryRouter, useBlocker) crea un Request en cada navegación y
// jsdom no lo implementa. Se pasan también AbortController y AbortSignal: el Request de Node solo acepta su
// propio AbortSignal.
const { TestEnvironment } = require('jest-environment-jsdom');

class JsdomWithFetchEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    const { Request, Response, Headers, AbortController, AbortSignal } = globalThis;
    Object.assign(this.global, { Request, Response, Headers, AbortController, AbortSignal });
  }
}

module.exports = JsdomWithFetchEnvironment;

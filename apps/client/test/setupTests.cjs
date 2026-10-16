// Se ejecuta antes de cada suite de Jest en apps/client.
// react-router 7 usa TextEncoder/TextDecoder, que el entorno jsdom de Jest no expone.
const { TextEncoder, TextDecoder } = require('node:util');

Object.assign(globalThis, { TextEncoder, TextDecoder });

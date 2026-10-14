// Mock de CSS Modules para Jest: devuelve el nombre de la clase tal cual (styles.button → 'button').
module.exports = new Proxy({}, { get: (_target, key) => (key === '__esModule' ? false : key) });

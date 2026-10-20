import os from 'node:os';
import path from 'node:path';

/** Archivo con la URI del MongoDB en memoria del servidor E2E, para sembrar datos desde los tests. */
export const E2E_MONGO_URI_FILE = path.join(os.tmpdir(), 'app-b2b-e2e-mongo-uri');

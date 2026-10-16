import mongoose, { type ConnectOptions } from 'mongoose';

/**
 * Backend embebido en escritorio (research R4): sin conexión, las operaciones fallan enseguida en vez de
 * quedarse esperando, y la selección de servidor no tarda más de 5 s.
 */
export const EMBEDDED_CONNECTION_OPTIONS: ConnectOptions = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000,
};

export async function connectDatabase(uri: string, options?: ConnectOptions): Promise<void> {
  await mongoose.connect(uri, options);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

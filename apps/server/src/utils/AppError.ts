/** Error de negocio o HTTP que errorHandler traduce al envelope { success: false, error }. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

import { model, Schema } from 'mongoose';
import { MAX_FAILED_ATTEMPTS } from '@app/shared';

export interface LoginAttemptFields {
  identifier: string;
  failedCount: number;
  lockedUntil: Date | null;
  updatedAt: Date;
}

const ONE_DAY_SEC = 24 * 60 * 60;

// Indexado por identificador normalizado (no por usuario): existe aunque el email no exista (research R4).
const loginAttemptSchema = new Schema<LoginAttemptFields>(
  {
    identifier: { type: String, required: true, unique: true },
    failedCount: { type: Number, required: true, default: 0, min: 0, max: MAX_FAILED_ATTEMPTS },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

loginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: ONE_DAY_SEC });

export const LoginAttemptModel = model<LoginAttemptFields>(
  'LoginAttempt',
  loginAttemptSchema,
  'loginAttempts',
);

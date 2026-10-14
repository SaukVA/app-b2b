import { model, Schema, type HydratedDocument, type Types } from 'mongoose';
import type { ClientKind } from '@app/shared';

export interface SessionFields {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  persistent: boolean;
  client: ClientKind;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = HydratedDocument<SessionFields>;

const CLIENTS: ClientKind[] = ['web', 'desktop'];

const sessionSchema = new Schema<SessionFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    persistent: { type: Boolean, required: true },
    client: { type: String, enum: CLIENTS, required: true },
    lastActivityAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// MongoDB borra la sesión en cuanto pasa expiresAt.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<SessionFields>('Session', sessionSchema);

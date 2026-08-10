import mongoose from 'mongoose';
import { ACTIONS, ENTITIES } from '../lib/enums.js';

/**
 * Append-only. Nothing in this application updates or deletes an audit document,
 * and no route may be added that does.
 */
const auditLogSchema = new mongoose.Schema({
  entity: { type: String, enum: ENTITIES, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, enum: ACTIONS, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: '' },
  at: { type: Date, default: Date.now },
  summary: { type: String, default: '' },
  changes: [
    {
      _id: false,
      field: String,
      from: mongoose.Schema.Types.Mixed,
      to: mongoose.Schema.Types.Mixed,
    },
  ],
  snapshot: mongoose.Schema.Types.Mixed,
});

auditLogSchema.index({ entity: 1, entityId: 1, at: 1 });
auditLogSchema.index({ at: -1 });
auditLogSchema.index({ actor: 1, at: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

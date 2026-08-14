import AuditLog from '../models/AuditLog.js';
import { FIELD_LABELS } from './enums.js';

const isObjectIdLike = (value) =>
  value && typeof value === 'object' && typeof value.toHexString === 'function';

/** Reduces a stored value to something plain that survives JSON and reads well later. */
export function plain(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (isObjectIdLike(value)) return value.toHexString();
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = plain(item);
    return out;
  }
  return value;
}

export function snapshotOf(doc) {
  const source = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
  const out = plain(source);
  if (out && typeof out === 'object') {
    delete out.__v;
    delete out.passwordHash;
  }
  return out;
}

const same = (a, b) => {
  const left = plain(a);
  const right = plain(b);
  if (left === right) return true;
  return JSON.stringify(left) === JSON.stringify(right);
};

/**
 * Field-level changes between two documents, limited to the fields given.
 * Returns [{ field, from, to }].
 */
export function diff(before, after, fields) {
  const beforeObj = typeof before?.toObject === 'function' ? before.toObject() : (before ?? {});
  const afterObj = typeof after?.toObject === 'function' ? after.toObject() : (after ?? {});
  const keys = fields ?? [...new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])];

  const changes = [];
  for (const field of keys) {
    if (['_id', '__v', 'createdAt', 'updatedAt', 'passwordHash'].includes(field)) continue;
    if (same(beforeObj[field], afterObj[field])) continue;
    changes.push({ field, from: plain(beforeObj[field]), to: plain(afterObj[field]) });
  }
  return changes;
}

const short = (value) => {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  // An attachment reads as the name the person recognises, not its stored id.
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value.originalName ? `“${value.originalName}”` : 'a file';
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  if (/^[a-f0-9]{24}$/.test(text)) return 'a different record';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

/** "Changed amount 40,000 → 45,000" */
export function summarise(changes, prefix = 'Changed') {
  if (!changes?.length) return 'No fields changed';
  const parts = changes
    .slice(0, 3)
    .map((c) => `${FIELD_LABELS[c.field] ?? c.field} ${short(c.from)} → ${short(c.to)}`);
  const rest = changes.length - parts.length;
  return `${prefix} ${parts.join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`;
}

export async function writeAudit({
  entity,
  entityId,
  action,
  actor,
  summary = '',
  changes = [],
  snapshot = null,
}) {
  return AuditLog.create({
    entity,
    entityId,
    action,
    actor: actor?.id ?? actor?._id ?? null,
    actorName: actor?.name ?? 'Unknown',
    at: new Date(),
    summary,
    changes,
    snapshot,
  });
}

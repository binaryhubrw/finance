import { forbidden, conflict } from './http.js';
import { ROLE_OF_STAGE, ROLE_LABELS, STATUS_LABELS } from './enums.js';

const idOf = (value) => (value ? String(value._id ?? value) : null);

/** Everyone who has already acted on this entry, whatever the stage. */
export function participants(entry) {
  return [
    idOf(entry.recordedBy),
    idOf(entry.approval1?.by),
    idOf(entry.settlement?.by),
    idOf(entry.approval2?.by),
  ].filter(Boolean);
}

/**
 * The gate for approving or returning an entry at its current stage.
 *
 * Only the role that owns the stage may act (an administrator may act at any
 * stage), and nobody may act on the same entry twice — not even the
 * administrator. That is the whole segregation rule, in one place.
 */
export function assertCanAct(entry, actor) {
  const owner = ROLE_OF_STAGE[entry.status];
  if (!owner) {
    if (entry.status === 'approved') throw conflict('This entry is already fully approved.');
    if (entry.status === 'void') throw conflict('This entry was voided, so it cannot be actioned.');
    throw conflict('This entry was returned to the initiator and is waiting for a correction.');
  }
  if (actor.role !== 'admin' && actor.role !== owner) {
    throw forbidden(
      `This entry is “${STATUS_LABELS[entry.status]}”. Only ${ROLE_LABELS[owner]} can act on it now.`,
    );
  }
  if (participants(entry).includes(actor.id)) {
    throw forbidden(
      'You already took part in this entry, so someone else has to handle this step.',
    );
  }
}

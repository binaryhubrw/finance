/**
 * Shared vocabulary. Kept out of the model files so client components can import
 * it without dragging Mongoose into the browser bundle.
 */

export const ROLES = ['admin', 'initiator', 'approver1', 'accountant', 'approver2', 'viewer'];

export const ROLE_LABELS = {
  admin: 'Administrator',
  initiator: 'Initiator',
  approver1: 'Approver 1',
  accountant: 'Accountant',
  approver2: 'Approver 2',
  viewer: 'Auditor',
};

export const ROLE_SUMMARIES = {
  admin: 'Can act at any stage of an entry (never twice on the same one), plus people and budget lines',
  initiator: 'Records entries and edits or resubmits their own',
  approver1: 'First approval: checks an entry, then passes it to the accountant or sends it back',
  accountant: 'Pays out or confirms receipt of the money once Approver 1 has approved',
  approver2: 'Final approval: only then does the entry count towards balances',
  viewer: 'Reads the ledger, the trail and the exceptions; changes nothing',
};

/** Roles that can see the audit trail, exceptions and the people filter. */
export const OVERSIGHT_ROLES = ['admin', 'approver1', 'approver2', 'viewer'];

/** Roles that may close months. */
export const CLOSER_ROLES = ['admin', 'approver1', 'approver2'];

export const KINDS = ['income', 'expense'];

export const TYPES = ['in', 'out'];

export const METHODS = ['cash', 'mobile_money', 'bank', 'other'];

export const METHOD_LABELS = {
  cash: 'Cash',
  mobile_money: 'Mobile money',
  bank: 'Bank',
  other: 'Other',
};

/**
 * The life of an entry:
 *   pending -> with_accountant -> final_review -> approved
 * Anyone who reviews can send it back (rejected) to the initiator, whose edit
 * restarts it at `pending`. `void` is a cancellation, available at any point.
 * Only `approved` counts towards balances and reports.
 */
export const STATUSES = ['pending', 'with_accountant', 'final_review', 'approved', 'rejected', 'void'];

/** Recorded but not yet fully approved: visible, but inert. */
export const IN_FLIGHT = ['pending', 'with_accountant', 'final_review'];

export const STATUS_LABELS = {
  pending: 'Awaiting Approver 1',
  with_accountant: 'Awaiting Accountant',
  final_review: 'Awaiting Approver 2',
  approved: 'Approved',
  rejected: 'Returned',
  void: 'Void',
};

/** Which status each role is responsible for acting on. */
export const STAGE_OF_ROLE = {
  approver1: 'pending',
  accountant: 'with_accountant',
  approver2: 'final_review',
};

/** The role that must act on an entry in this status. */
export const ROLE_OF_STAGE = {
  pending: 'approver1',
  with_accountant: 'accountant',
  final_review: 'approver2',
};

/** The status an entry moves to once its current stage is cleared. */
export const NEXT_STATUS = {
  pending: 'with_accountant',
  with_accountant: 'final_review',
  final_review: 'approved',
};

/** The statuses a user can act on right now (admin: every stage). */
export const actionableStatuses = (role) =>
  role === 'admin' ? IN_FLIGHT : STAGE_OF_ROLE[role] ? [STAGE_OF_ROLE[role]] : [];

export const ENTITIES = ['transaction', 'category', 'user', 'period'];

export const ACTIONS = [
  'comment',
  'create',
  'update',
  'approve',
  'reject',
  'void',
  'close',
  'reopen',
  'login',
];

export const ACTION_LABELS = {
  comment: 'Commented',
  create: 'Created',
  update: 'Edited',
  approve: 'Approved',
  reject: 'Rejected',
  void: 'Voided',
  close: 'Closed month',
  reopen: 'Reopened month',
  login: 'Signed in',
};

export const FIELD_LABELS = {
  date: 'date',
  description: 'description',
  category: 'budget line',
  type: 'direction',
  amount: 'amount',
  extras: 'additional charges',
  method: 'method',
  reference: 'reference',
  receiptUrl: 'receipt link',
  attachment: 'receipt file',
  payee: 'payee',
  note: 'note',
  status: 'status',
  reviewNote: 'review note',
  monthlyBudget: 'monthly budget',
  role: 'role',
  active: 'active',
  name: 'name',
  email: 'email',
  password: 'password',
};

/**
 * Shared vocabulary. Kept out of the model files so client components can import
 * it without dragging Mongoose into the browser bundle.
 */

export const ROLES = ['admin', 'auditor', 'accountant', 'viewer'];

export const ROLE_LABELS = {
  admin: 'Administrator',
  auditor: 'Auditor',
  accountant: 'Accountant',
  viewer: 'Viewer',
};

export const ROLE_SUMMARIES = {
  admin: 'Everything an auditor can do, plus people and budget lines',
  auditor: 'Approves, rejects and voids; reads the trail; closes months',
  accountant: 'Records entries and edits their own while pending',
  viewer: 'Reads the ledger and reports',
};

export const KINDS = ['income', 'expense'];

export const TYPES = ['in', 'out'];

export const METHODS = ['cash', 'mobile_money', 'bank', 'other'];

export const METHOD_LABELS = {
  cash: 'Cash',
  mobile_money: 'Mobile money',
  bank: 'Bank',
  other: 'Other',
};

export const STATUSES = ['pending', 'approved', 'rejected', 'void'];

export const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  void: 'Void',
};

export const ENTITIES = ['transaction', 'category', 'user', 'period'];

export const ACTIONS = [
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
  method: 'method',
  reference: 'reference',
  receiptUrl: 'receipt link',
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

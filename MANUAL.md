# UR Binary Hub Finance — User Manual

For everyone who uses the system: accountants, approvers, administrators and auditors.
No technical knowledge assumed. If you are setting the system up on a server instead,
read [README.md](README.md).

---

## 1. What this system is for

The hub takes money in and pays money out. This system records every franc of it, so that
at any moment two questions have a clear answer:

1. **How much money does the hub have?**
2. **Who decided each entry was correct?**

It works the way a paper cashbook works, with one rule added: **two different people are
involved in every entry.** One person records what happened. A different person checks it
and approves it. Until that second person approves, the entry sits in the book but does not
count towards the balance.

That is the whole idea. Everything else in this manual follows from it.

Amounts are in **Rwandan francs (RWF)**.

---

## 2. The four roles

Your role decides what you can do. An administrator sets it when your account is created.

| Role | What it is for | Can do |
|---|---|---|
| **Accountant** | The person who handles the money day to day | Records entries. Edits or cancels **their own** entries, but only while still pending. Views the ledger and reports. Exports to Excel. |
| **Approver** | The person who checks the accountant's work | Approves, rejects and voids entries. Reads the audit trail and exceptions. Closes months. Exports. **Cannot record or edit entries.** |
| **Administrator** | The person who runs the system | Everything an approver can do, plus manages people and budget lines. |
| **Auditor** | Anyone who checks the books without touching them | Reads the ledger, the reports, the audit trail and the exceptions page. Can leave comments on entries. Changes nothing else. |

**An approver cannot record entries, and this is deliberate.** If the same person could both
write an entry and approve it, the check would be worthless. The system enforces this on the
server, not just by hiding buttons — the answer is the same whoever asks.

For the same reason, **nobody can approve an entry they recorded themselves**, even an
administrator. If you try, you get:

> You recorded this entry, so someone else has to approve it. Ask another approver to review it.

---

## 3. Five rules that govern everything

Learn these and the rest of the system explains itself.

### 1. Approval gates the balance
A new entry is **pending**. It appears in the ledger and you can see it, but it does not move
the running balance and does not appear in reports. Only after an approver approves it does it
count. This is why the balance column shows a small dash, not a number, next to a pending row.

### 2. Nothing is ever deleted
There is no delete button anywhere, and no hidden one either. An entry that was a mistake gets
**voided** — it stays visible, dimmed, with its description struck through and the reason
shown beside it. The record of the mistake is part of the record.

### 3. Editing after review undoes the review
If an approved or rejected entry is edited, the earlier decision no longer applies to what the
entry now says. So the entry goes **back to pending**, the reviewer is cleared, and it is
flagged as edited. It reappears in the approvals queue marked "re-submitted after edit". The
approver is told what changed.

### 4. Closed months are frozen
At the end of a month, an approver closes it. After that, nothing dated inside that month can be
created, edited, voided or approved:

> March 2026 is closed. Record the correction in an open month instead.

A month cannot be closed while any entry inside it is still waiting for approval.

### 5. Every action is written down
Recording, editing, approving, rejecting, voiding, closing a month, adding a person, even
signing in — all of it goes to the audit trail with who did it, when, and exactly which fields
changed. The trail is append-only. Nobody can edit or delete it, including administrators.

---

## 4. The life of an entry

```
                        ┌──────────────────────────┐
   Accountant           │                          │  Approver approves
   records  ──────────► │        PENDING           │ ─────────────────► APPROVED
                        │  (in the book, but the   │                    counts towards
                        │   balance ignores it)    │ ─────────────────► REJECTED
                        │                          │  Approver rejects   with a reason
                        └──────────────────────────┘
                                    ▲                       │
                                    │                       │
                                    └───────────────────────┘
                                     an edit sends it back
                                     to pending, flagged

   Any entry, at any point ──────────────────────────────────► VOID
                                  Approver voids it,           stays visible,
                                  with a reason               struck through
```

**Pending** — recorded, waiting. Does not count.
**Approved** — checked and accepted. Counts towards the balance and appears in reports.
**Rejected** — checked and refused, with a reason. Does not count. Stays visible.
**Void** — cancelled, with a reason. Does not count. Stays visible, struck through.

---

## 5. Getting started

### Signing in
Go to the address your administrator gave you and enter your email and password. If the
password is wrong you will see:

> That email and password do not match. Check both and try again.

After ten failed attempts the system pauses sign-in for that account for fifteen minutes.

### Change your password on the first day
Your first password was typed by whoever created your account, so they know it. Go to
**Settings → Your account** and change it. You need your current password and a new one of at
least 8 characters.

If you have forgotten your password, an administrator can set a new one for you from
**Settings → People → Reset password**. There is no email reset.

### Finding your way
The sidebar down the left is the whole application. On a phone it becomes a row of links
across the top. You only see the screens your role can use.

| | |
|---|---|
| **Overview** | The month at a glance |
| **Ledger** | The cashbook itself — every entry |
| **Approvals** | Entries waiting for a decision (with a count badge) |
| **Audit trail** | Everything that has happened *(hidden from accountants)* |
| **Exceptions** | What to look at twice *(hidden from accountants)* |
| **Reports** | Totals over any date range |
| **Settings** | Budget lines, people, closing months *(approvers and administrators)* |

Your name and role sit in the slim bar across the top of every screen, alongside **Sign out**.
Clicking your name opens Settings → Your account, which is how an accountant or auditor changes
their own password.

---

## 6. Screen by screen

### Overview

Where you land when you sign in. Pick a month at the top; it opens on the current month.

Four figures across the top:

- **Opening balance** — what the hub held at the start of the month
- **Money in** and **Money out** — approved movements during the month
- **Current balance** — the headline number: what the hub holds now. For a month that has
  finished, or one that has been closed, it reads **Closing balance** instead, because the
  figure is final

Then **Awaiting approval**, showing how many entries are waiting and what they are worth.
Click it to go straight to Approvals. Below that, six months of money in and out side by side,
and the five largest expenses of the month.

Every figure here counts **approved entries only**.

### Ledger

The cashbook. This is the screen you will use most.

Columns: **Date · Description · Method · Status · Money in · Money out · Balance**

Underneath each description you also get the payee, the reference and the budget line.

**Reading the rows:**

- Entries read **newest first**. The **opening balance** is therefore the last row, not the
  first — it is what the book held before the oldest entry on screen.
- **Pending** rows carry an amber marker down the left edge, and the balance column shows a
  dash. That gap is the point: the entry has not counted yet.
- **Void** rows are dimmed and struck through, with the reason shown.
- The **Balance** column sits in its own tinted lane, separated by a rule — the ruled balance
  column of a physical cashbook. It only ever counts approved entries.

**The balance column disappears when you filter.** A running balance only makes sense over a
continuous stretch of the book. The moment you filter by budget line, status, person or search
term, you are looking at a selection, and a running total over a selection would be misleading.
Filter by date alone and the column comes back.

**Filters:** date range, direction, budget line, method, status, search, and who recorded it.
**Clear filters** resets them.

**Export to Excel** downloads exactly what you are looking at as a spreadsheet, with the
amounts already formatted and totals at the foot.

### Recording an entry

**Record entry** on the Ledger. Accountants and administrators only.

| Field | What to put in it |
|---|---|
| **Date** | The day the money actually moved, not the day you are typing. Future dates are refused. |
| **Direction** | Money in or money out. |
| **Amount** | Digits only. |
| **Additional charges** | Press **Add a charge to this amount** for anything that belongs on top — delivery, a bank charge, VAT. Give each one a name and an amount; the dialog shows the running total, and that total is what gets recorded. A 1,000 payment with 200 of charges is saved as 1,200, with the breakdown kept so anyone can see where it came from. |
| **Budget line** | The list narrows to lines matching the direction — income lines for money in, expense lines for money out. |
| **Description** | What it was for, in plain words. This is what the approver reads. |
| **Paid to / Received from** | The other party. |
| **Method** | Cash, mobile money, bank or other. |
| **Reference** | Receipt number, MoMo transaction ID, cheque number. |
| **Receipt link** | A link to a photo of the receipt — a Drive or Photos link is fine. The system does not store the image itself, only the link. |
| **Note** | Anything the approver should know. |

**Fill in the reference or the receipt link for every expense.** An expense with neither is
flagged under Exceptions, because months later there is no way to verify it happened.

When you save, the entry is pending and the screen says so. It is now the approver's turn.

**Fixing a mistake:** while an entry is still pending, you can **Edit** your own entries
freely. Once it has been approved or rejected, editing it sends it back to pending for a fresh
decision. You can only touch entries you recorded yourself:

> You can only edit entries you recorded yourself.

### Importing a spreadsheet

**Import a sheet** on the Ledger, next to Record entry. Accountants and administrators only.
Use it when you have a batch to enter — a month of receipts, a list from the bank.

1. **Download the template.** It opens in Excel with the right columns. Direction, Budget line
   and Method are dropdowns, so you pick from the list instead of typing and mistyping.
2. **Fill in one row per entry.** Dates as `dd/mm/yyyy`, one budget line per row spelled the way
   it appears in the system. The dialog lists every budget line in use, so copy from there.
3. **Upload it.** `.xlsx` straight from Excel, Numbers or Google Sheets works, so does `.csv`.
   Up to 2MB, up to 500 rows at a time.
4. **Check the preview.** Nothing has been saved yet. Every row is listed with either "Ready"
   or the exact problem with it — a budget line that does not exist, a date in the future, an
   amount that is not a number.
5. **Attach a supporting document, if you have one.** These fields appear with the preview,
   once the sheet has been read. A bank statement or a scanned batch of receipts is stored
   once and attached to every entry in the import, and a note here goes on each of them too —
   added to any note already on the row.
6. **Import.** The button turns on only when every row is ready.

**A sheet with any bad row imports nothing.** This is on purpose: half a batch in the book, with
no easy way to tell which half, is worse than a rejected file. Fix the rows it names, upload
again.

Imported entries are **pending**, exactly like typed ones, and each gets its own line in the
audit trail naming the file it came from.

### Approvals

The approver's working screen. Every list reads newest first.

Four tabs run across the top — **All**, **Pending**, **Approved** and **Rejected** — each
showing how many entries are in that state, what they are worth, and their share of the book.
Clicking one filters the table beneath it. The screen opens on Pending, since that is the work
waiting for you; **All** puts the three together with a status badge on every row, and you can
still approve or reject a pending entry from there. The screen opens on Pending; Approved and Rejected show who made
the decision, with the comment either decision carried.

Each row shows everything you need to decide without clicking anywhere: description, amount,
budget line, who recorded it and when, and the receipt reference. Warning lines appear when
something deserves attention — no receipt reference, or the entry was edited after a previous
review.

- **Preview** — opens the attached receipt beside the decision, so you can check it against the
  amount without leaving the queue. An expense with no receipt says so in the same place.
- **Approve** — the entry counts from that moment, and the balance moves by exactly that amount.
  You can add a comment ("checked against the bank statement"), but you do not have to.
- **Reject** — you must give a reason. The entry stays visible with your reason attached so the
  accountant knows what to fix.

> Say why you are rejecting this entry.

When the queue is empty: *"Nothing waiting. The accountant is up to date."*

**Voiding.** Use void, not reject, when an entry should never have existed at all — a duplicate,
a payment that was reversed. Voiding also needs a reason. The entry stays in the book, struck
through, and stops counting.

### Comments

Every entry carries a **Comment** button, on the Ledger and on Approvals. It opens the remarks
already left against that entry and a box to add one.

Anyone who can see an entry can comment, and that includes the **Auditor** — the read-only
role. This is the one thing that role can add. A comment changes nothing about the entry: not
the amount, not the status, not the balance. It is a question or an observation left where the
next person will find it: *"checked against the March statement"*, *"asked Claudine about the
reference"*.

**Comments cannot be edited or removed.** Like the audit trail, a remark that could be quietly
rewritten later would be worth nothing to whoever reads it. Each one records who wrote it, in
what role, and when — and it also appears in the audit trail.

### Audit trail

Everything that has happened, newest first. Auditors and administrators.

Each line shows the time, who did it, what they did, and which entry. Changes are spelled out
field by field:

```
amount: 40,000 → 45,000
```

**Snapshot** on any row opens the full record as it stood right after that action.

Filter by person, by action, or by date to answer a specific question — "what did this person
change last Tuesday", "show me every void this quarter".

This screen is read-only, for everyone. There is no way to alter the trail from anywhere in the
system, and no administrator setting that unlocks it.

### Exceptions

The screen an approver should open first. It does not find fraud — it finds the entries most
worth a second look, in six lists.

| List | Why it matters |
|---|---|
| **Missing receipt** | An expense with no receipt reference cannot be verified later. |
| **Edited after review** | These changed after someone had already reviewed them, so the earlier decision no longer applies. |
| **Large amounts** | Anything at or above the threshold deserves a second signature. |
| **Backdated** | Recorded more than seven days after the date on the entry, so the paperwork trail may be thin. |
| **Possible duplicates** | Entries sharing a date, an amount and a budget line are often the same payment recorded twice. |
| **Waiting too long** | Pending for more than seven days. The balance is understated until these are cleared. |

Every row links into the ledger so you can see the entry in context. Empty sections collapse to
a quiet "Nothing flagged".

A flagged entry is not necessarily wrong. Ask about it, and if the answer is satisfactory, note
it and move on.

### Reports

Totals over any date range. Shortcuts for **This month**, **Last month**, **This quarter** and
**This year**, or set your own dates.

- Summary figures for the range
- **Spending by budget line** as bars, with the amount and its share of the total — and where a
  monthly budget is set on that line, budget against actual
- **Income by budget line**
- **Split by payment method** — how much moved as cash, as mobile money, through the bank
- **Month by month** as a table

**Download Excel** gives you the lot as one spreadsheet — a sheet per table plus a summary
sheet naming the range and the currency, with the figures already formatted. Open it, print
it, or attach it to the month-end pack.

Reports count approved entries only, so report totals and the ledger's closing balance for the
same range always agree. If they ever disagree, something is wrong — say so.

### Settings

**Budget lines** *(administrators)* — Add a line, rename it, set a monthly budget, deactivate it.

A budget line in use cannot be deleted. Deactivate it instead: it disappears from the entry form
for new entries, while past entries keep their history intact. Renaming a line is safe — the
audit trail keeps the old name against the entries that used it.

**People** *(administrators)* — Add someone, change their role, reset a password, deactivate an
account when they leave. Deactivating is the right move for a departure: the person can no
longer sign in, but everything they recorded stays attributed to them.

You cannot demote or deactivate your own account. That is what stops the last administrator
locking everyone out.

**Close a month** *(approvers and administrators)* — the month-end ritual:

1. Pick the month.
2. Enter the cash you physically counted, if you counted it.
3. The screen shows the **book balance**, your **counted** figure and the **variance** between
   them, before you confirm.
4. Confirm.

If anything in that month is still pending, closing is refused:

> 3 entries are still waiting for approval in March 2026. Clear the approval queue before
> closing the month.

Clear the queue first, then close. Closed months are listed underneath with a **Reopen** action
for administrators — reopening is logged like everything else.

**Your account** — change your own password.

---

## 7. The monthly routine

**Every day — accountant.** Record entries as they happen, while you still have the receipt in
your hand. Attach the reference or a photo link to every expense.

**Two or three times a week — approver.** Clear the approvals queue. Entries sitting pending mean
the balance on the Overview is understating what the hub has actually spent.

**End of the month — approver.**

1. Clear the approvals queue completely.
2. Open **Exceptions** and work through each list. Ask about anything you do not recognise.
3. Reconcile against the outside record: the bank statement, the mobile money statement, and a
   physical count of the cash box.
4. Open **Settings → Close a month**, enter the cash you counted, check the variance, confirm.
5. Keep the Excel export from **Reports** for the month with your records.

Once the month is closed, its numbers cannot drift. Anything discovered afterwards is recorded
as a correction in the current month, which is exactly how a paper cashbook handles it.

---

## 8. Messages you might see

| Message | What it means | What to do |
|---|---|---|
| *You recorded this entry, so someone else has to approve it.* | You are trying to approve your own work. | Ask a different approver. |
| *Your role (approver) cannot do this.* | Auditors do not record entries — the separation is the point. | Ask the accountant to record it. |
| *March 2026 is closed. Record the correction in an open month instead.* | The entry is dated inside a closed month. | Record it in the current month as a correction, or ask an administrator to reopen the month. |
| *3 entries are still waiting for approval in March 2026.* | You are closing a month with pending entries. | Clear the approvals queue, then close. |
| *You can only edit entries you recorded yourself.* | It is someone else's entry. | Ask them to change it, or ask an approver to void it. |
| *This entry has already been reviewed. Ask an approver to void it.* | Pending entries can be cancelled by the person who recorded them; reviewed ones cannot. | Ask an approver to void it. |
| *This entry was voided, so it can no longer be edited.* | Void is final. | Record a new, correct entry. |
| *"Rent" is an expense line, so it cannot hold money coming in.* | The budget line does not match the direction. | Pick an income line, or change the direction. |
| *A budget line with that name already exists.* | Duplicate name. | Reuse the existing line, or reactivate it if it was deactivated. |
| *Someone already uses that email address.* | That person already has an account. | Reactivate their existing account instead of making a second one. |
| *2 of 40 rows still have a problem, so nothing was imported.* | An import with bad rows. | Fix the rows it names in your sheet and upload again. |
| *3 of 5 entries need attention, so none were saved.* | Several entries recorded together, one of them wrong. | Fix the lines marked in the dialog, then save again. |

---

## 9. Questions people ask

**My entry does not show in the balance. Is it lost?**
No. It is pending. Look at the Status column — it will say Pending, with a dash in the balance
column. It counts the moment an approver approves it.

**Why can't I approve my own entry? I know it is correct.**
Because the value of the check comes entirely from a second pair of eyes. An approval you gave
yourself proves nothing to an approver next year. The rule holds for administrators too.

**Where is the delete button?**
There isn't one. Void the entry instead, with a reason. Deleting would leave a hole in the
record with nothing to explain it; a voided entry explains itself.

**I recorded 45,000 but it was 40,000.**
If it is still pending, edit it. If it has been approved, edit it anyway — it goes back to
pending and an approver reviews the change, seeing exactly what moved. Both versions stay in the
audit trail.

**Can an administrator quietly change the audit trail?**
No. Nothing in the system writes to the trail except the act of doing something, and there is no
screen, setting or button anywhere that edits or removes an entry from it.

**We closed the month and then found a receipt.**
Record it in the current month with a description saying which month it belongs to. That is what
a paper cashbook does. If it is large enough to matter to the closed month's figures, an
administrator can reopen the month — and the reopening is logged.

**Two people recorded the same payment.**
It will appear under **Exceptions → Possible duplicates**. Void one of them with the reason
"duplicate of the entry recorded by …".

**Someone left the hub.**
Deactivate their account in Settings → People. Do not delete it and do not reuse it for a new
person — everything they recorded is attributed to them, and that attribution needs to stay
true.

**The numbers on Reports and the Ledger disagree.**
They should never disagree for the same date range, since both count only approved entries.
Check that you are comparing the same range and that the ledger is not filtered. If they still
disagree, report it — that is a real defect.

---

## 10. What this system does not do

By design, so you know to handle these elsewhere:

- It does not store receipt images. It stores a link to one.
- It handles Rwandan francs only.
- It is not double-entry bookkeeping and has no chart of accounts.
- It does not issue invoices.
- It does not connect to a bank or mobile money feed. Reconciliation is a human comparing this
  book against a statement.
- It does not send email or SMS notifications. The pending count in the sidebar is the reminder.

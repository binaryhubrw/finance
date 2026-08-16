# UR Binary Hub Finance — Screen Reference

Every screen, every control, what each one does and who can use it. This is the
look-it-up companion to [MANUAL.md](MANUAL.md), which explains *why* the system works the
way it does. If you want to understand the rules, read the manual. If you want to know what
a particular button does, you are in the right place.

**Roles are abbreviated throughout:** ACC accountant · APR approver · ADM administrator ·
AUD auditor.

---

## Reading the interface

These cues mean the same thing everywhere they appear.

| Cue | Meaning |
|---|---|
| **Amber bar down the left edge of a row or card** | The entry is pending. It has not counted yet. |
| **Dash `–` in a figure or the Balance column** | Deliberately not a number. Either the entry is not approved, or nothing was entered. |
| **Struck-through description, greyed row** | The entry is void. It stays in the book but counts for nothing. |
| **Green figure** | Money in. |
| **Red figure** | Money out, or a negative variance. |
| **Underlined description** | You can click it to edit that entry. If it is not underlined, you cannot edit it. |
| **Status badge** | `Pending` `Approved` `Rejected` `Void` — the entry's current state. |
| **Number badge on the Approvals link** | How many entries are waiting for review, across the whole book. |

All figures are right-aligned and set in a monospace face so digits stack in a column. That
is deliberate: a column of numbers that does not line up is hard to check.

---

## Sign in

The only screen you can reach without an account.

| Control | What it does |
|---|---|
| **Email** | Your work email address. Not case-sensitive. |
| **Password** | At least 8 characters. |
| **Sign in** | Signs you in and sends you to the Overview — or back to the page you were trying to reach. |

After ten failed attempts for the same email, sign-in is refused for fifteen minutes.
Nothing on this screen can create an account or reset a password; an administrator does
both.

---

## The sidebar

Present on every screen. Dark panel down the left on a desktop; a row of links across the
top under 860px wide.

| Control | What it does | Who sees it |
|---|---|---|
| **UR Binary Hub wordmark** | Returns to the Overview. | All |
| **Overview** | The month at a glance. | All |
| **Ledger** | The cashbook. | All |
| **Approvals** | The review queue. The badge counts entries waiting. | All |
| **Audit trail** | Every logged action. | APR ADM AUD |
| **Exceptions** | The six checks. | APR ADM AUD |
| **Reports** | Totals over a date range. | All |
| **Settings** | Budget lines, people, month close. | APR ADM |
Accountants do not see Audit trail or Exceptions. Both are reviewer screens, and hiding
them keeps the accountant's sidebar to the work they actually do.

---

## The header

A slim bar across the top of every screen, holding the account rather than the navigation.

| Control | What it does | Who sees it |
|---|---|---|
| **Your initials, name and role** | Confirms who you are signed in as, and opens Settings → Your account. This is how an accountant or auditor reaches Settings at all. | All |
| **Sign out** | Ends the session and returns to Sign in. | All |

On a desktop the bar stays put as the page scrolls. Below 860px the sidebar becomes a row of
links across the top and the header sits directly beneath it.

---

## Overview

Opens on the current month.

| Control | What it does |
|---|---|
| **Month** (dropdown, top right) | Switches the whole page to another month. Offers the last 24 months. The choice goes into the address, so the view can be bookmarked or sent to someone. |
| **Go to approvals** | Appears only when something is waiting. Jumps to the Approvals queue. |

**What the page shows**

| Panel | What it means |
|---|---|
| **Opening balance** | Everything approved *before* this month, netted. |
| **Money in** | Approved money in during the month. |
| **Money out** | Approved money out during the month. |
| **Current balance** / **Closing balance** | Opening + in − out, with the count of approved entries beneath. It reads **Current balance** while the month is still running, and **Closing balance** once the month is over or has been closed — a month still in progress has no closing figure yet. |
| **Awaiting approval** | How many entries are pending and what they are worth. Reads "Nothing waiting. The accountant is up to date." when the queue is clear. |
| **Six months in and out** | Green and red bars per month, this month and the five before it. Approved entries only. |
| **Largest expenses this month** | The five biggest approved expenses, largest first, with budget line and date. |

If the month has been closed, the line under the title says so and nothing dated inside it
can be changed.

---

## Ledger

The cashbook, and the busiest screen in the system.

### Filter bar

Every filter goes into the address, so a filtered view can be bookmarked or shared. Changing
any dropdown applies immediately; the search box needs **Find** or the Enter key.

| Control | What it does | Who sees it |
|---|---|---|
| **From** / **To** | The date range. Defaults to the current month. | All |
| **Direction** | All, Money in, Money out. | All |
| **Budget line** | Narrows to one line. Lists every line, active or not. | All |
| **Method** | Cash, Mobile money, Bank, Other. | All |
| **Status** | Pending, Approved, Rejected, Void. | All |
| **Recorded by** | Narrows to one person. | APR ADM AUD |
| **Search** | Matches the description, payee, reference and note. | All |
| **Find** | Runs the search. | All |
| **Clear filters** | Appears once something beyond the dates is set. Resets everything except the date range. | All |

**Anything beyond a date filter hides the Balance column**, and the bar says so. A running
balance over a filtered selection would be arithmetic that means nothing.

### Toolbar

| Control | What it does | Who sees it |
|---|---|---|
| **Entry count** (left) | How many entries match, and how many of those are still pending and what they are worth. | All |
| **Export to Excel** | Downloads exactly the rows on screen as an `.xlsx` workbook — formatted amounts, real dates, and a totals block. Disabled when there is nothing to export. | All |
| **Import a sheet** | Opens the spreadsheet import dialog. | ACC ADM |
| **Record entry** | Opens the entry form. | ACC ADM |

### The table

| Column | What it holds |
|---|---|
| **Date** | The date the money moved. An amber bar on this edge means pending. Rows read newest first. |
| **Description** | What the entry is for, with payee · reference · budget line beneath. A voided, rejected or commented-on approved entry shows its note here, an edited one is marked "Edited after review", and **Preview** (when a receipt is attached) and **Comment** buttons sit beneath. |
| **Method** | Cash, mobile money, bank or other. |
| **Status** | The badge. |
| **Money in** | Green, filled only for money in. |
| **Money out** | Red, filled only for money out. |
| **Balance** | The running balance after this entry, in its own tinted lane. Approved rows only — everything else shows a dash. Hidden entirely when filters are active. |

Because the newest entry is at the top, the **opening balance** row sits at the *foot* of the table — it is what the book held before the oldest entry shown. Each balance is still the balance as it stood after that entry, so the column counts down the page.

| Control | What it does |
|---|---|
| **Clicking an underlined description** | Opens that entry for editing. Only appears on entries you are allowed to edit — your own pending ones as an accountant, anything not void as an administrator. |
| **Previous** / **Next** | Move between pages. Only shown when there is more than one page. |

Empty range: *"Nothing recorded in this range yet."*

---

## Record entry / Edit entry

The same dialog does both. Opened by **Record entry**, or by clicking an underlined
description. ACC and ADM only.

| Field | Notes |
|---|---|
| **Date** | Defaults to today. Future dates are refused by the picker itself. |
| **Direction** | Two buttons — **Money in** and **Money out**. Switching them clears the budget line, because the list of lines depends on the direction. |
| **Amount** | Greater than zero. Two decimal places allowed. |
| **Add a charge to this amount** | Adds a named amount — delivery, a bank charge, VAT — that folds into the total. Each has a name and an amount, up to ten per entry, and a running **Total recorded** shows what will actually be saved. Record 1,000 with a 200 charge and the entry is 1,200. |
| **Budget line** | Only lines matching the direction appear: income lines for money in, expense lines for money out. Starts as "Choose a line". |
| **Description** | Required, up to 300 characters. This is what the approver reads first. |
| **Paid to** / **Received from** | The label follows the direction. |
| **Method** | Cash, Mobile money, Bank, Other. Defaults to Cash. |
| **Reference** | Receipt number or mobile money transaction ID. |
| **Receipt link** | A URL to a photo of the receipt. The system stores the link, not the image. |
| **Note** | Up to 500 characters, for anything the approver should know. |

| Control | What it does |
|---|---|
| **Cancel** | Closes without saving. |
| **Record entry** / **Save changes** | Saves. A new entry is created as pending. |
| **Void this entry** | Only on an existing entry. Opens a reason box; **Void this entry** confirms, **Keep it** backs out. A reason is required. |

The dialog tells you what will happen before you commit: a new entry says it waits for an
approver, and an edit says that changing a reviewed entry sends it back to the queue.

Leave the reference and receipt link empty on an expense and the entry is flagged under
Exceptions. It still saves — this is a prompt, not a block.

---

## Import a sheet

Opened by **Import a sheet** on the Ledger. ACC and ADM only.

| Control | What it does |
|---|---|
| **Download template** | Downloads an `.xlsx` workbook. The **Entries** sheet has the right headings, two example rows, and **dropdowns** on Direction, Budget line and Method, so the fields that have to match are picked rather than typed. A **Lists** sheet holds the budget lines the dropdown points at. |
| **Supporting document** | Appears once the sheet has been read, alongside the preview. Optional: one file — a bank statement, say — attached to every entry in the batch. It is stored once and shared by all of them, and only written when you confirm the import. |
| **Note for every entry** | Appears with the preview. Optional, and added to each row's own note rather than replacing it. |
| **Columns** (list) | Every column the importer understands, which are required, and the format each expects. |
| **Budget lines in use** (list) | Every active line with its direction. Names in the sheet must match these. |
| **Spreadsheet** (file picker) | Accepts `.xlsx` and `.csv`, up to 2MB and 500 rows. Choosing a file immediately checks it — nothing is saved. |
| **Preview table** | One row per line in your sheet: the row number as the spreadsheet counts it, the date, description, amount, and either **Ready** or the exact problems found. |
| **Cancel** | Closes and discards the upload. |
| **Import N entries** | Only enabled when every row is ready. Writes them all as pending. |
| **Import another sheet** | After a successful import, resets the dialog for the next batch. |
| **Back to the ledger** | Closes and refreshes the ledger behind it. |

**If any row has a problem, nothing is imported.** Fix the rows the preview names and upload
the file again. Imported entries are pending exactly like typed ones, and each one gets its
own audit entry naming the file it came from.

---

## Approvals

The review queue. Everyone can see it; only APR and ADM can act.

### The three status tabs

Four tabs run across the top: **All** (brand blue), then **Pending** (amber), **Approved**
(green) and **Rejected** (red). They are both a summary and the filter for the table
underneath — the selected one loses its bottom rule and shares a surface with the table, so
the two read as one object.

The screen still opens on **Pending**, because that is the work queue and the sidebar badge
counts it. **All** shows the three states together, newest first, with a status badge on
every row; its bar is a three-part breakdown rather than a percentage, and its last column
reads **Review** — pending rows keep their Approve and Reject buttons, settled rows show who
decided and why.

**All** does not include voided entries. A void is a cancellation rather than a review
decision, and voided entries live in the Ledger.

| On each tab | What it shows |
|---|---|
| Count | How many entries are in that state, in that state's colour. |
| Worth | The total value of them. |
| Share bar | That state's share of every reviewable entry in the book, with the percentage beneath. |

Selecting a tab puts it in the address (`/approvals?status=approved`), so a view can be
bookmarked or sent to someone. Void is not one of the tabs — a voided entry is a cancelled
one, and it lives in the Ledger.

### The table

Columns: **Date · Entry · Recorded by · Amount**, then a last column that changes with the
tab — **Decision** (the buttons), **Approved by**, or **Reason**.

The Date cell carries a 3px marker in the row's status colour. Under the description sit the
budget line, method, payee and reference, plus the note and receipt link when present.

| Element | When it appears |
|---|---|
| **Open the receipt** (link) | The entry has a receipt link. Opens it in a new tab. |
| **No receipt reference and no receipt link** (amber) | An expense with neither. It cannot be verified later. |
| **Re-submitted after edit** (amber) | It was reviewed before and has changed since, so the earlier decision no longer applies. |

| Control | What it does | Who sees it |
|---|---|---|
| **Preview** | Opens the entry's receipt file in a panel, without leaving the table. Only shown when a file is attached; an expense with none says *"No receipt to check"* in its place. | All |
| **Comment** / **Comments N** | Opens the entry's remarks and a box to add one. Everyone who can see the entry can post, the read-only Auditor included. Comments cannot be edited or removed, and each appears in the audit trail. | All |
| **Approve** | Opens the approval box, which carries an **optional** comment. | APR ADM |
| **Reject** | Opens the rejection box, which requires a **reason**. | APR ADM |
| **Cancel** / **Approve entry** / **Reject entry** | Back out, or confirm. **Reject entry** stays disabled until a reason is typed; **Approve entry** is available straight away. | APR ADM |

Every tab reads newest first. Approved and rejected show who made the decision and when,
along with the comment either decision carried. Both settled lists show the newest 50, with a link into the ledger
when there are more.

If you recorded the entry yourself, the buttons are replaced by *"You recorded this one, so
another reviewer has to clear it."* Accountants and auditors see *"An approver reviews this
one."*

Empty queue: *"Nothing waiting. The accountant is up to date."*

Voiding is not on this screen. Open the entry from the Ledger to void it.

---

## Audit trail

Every logged action, newest first. APR, ADM and AUD. Read-only, for everyone.

| Control | What it does |
|---|---|
| **Person** | Narrows to one actor. Defaults to Anyone. |
| **Action** | Created, Edited, Approved, Rejected, Voided, Closed month, Reopened month, Signed in. |
| **From** / **To** | The date range. |
| **Snapshot** / **Hide** | Expands the full record as it stood immediately after that action, as raw data. Only shown on rows that carry one. |
| **Previous** / **Next** | Move between pages. |

**Columns:** When · Who · Action (with the kind of record beneath) · What changed.

The "What changed" column gives a plain sentence, and under it the field-level changes, one
per line, as `amount: 40,000 → 45,000`. The new value is the darker of the two.

No filter combination reveals a way to edit or delete an entry, because none exists.

Nothing matching: *"No actions match these filters."*

---

## Exceptions

Six checks over the book. APR, ADM and AUD. An accountant who reaches this address sees a
short note explaining that it is a reviewer's screen.

Each section is a collapsible panel. Sections with something in them open automatically;
empty ones stay shut and read "Nothing flagged".

| Control | What it does |
|---|---|
| **Section heading** | Click to expand or collapse. The count sits beside the title, and the line under it explains why the check matters. |
| **Show** / **Hide** | The same toggle, on the right of the heading. |
| **Any entry description** | Links into the Ledger, filtered to that day and that description. |

| Section | What it catches |
|---|---|
| **Missing receipt** | Expenses, pending or approved, with no reference and no receipt link. |
| **Edited after review** | Entries changed after a review had already happened. |
| **Large amounts** | At or above the threshold set for this installation. The heading states the figure. |
| **Backdated** | Recorded more than seven days after the date on the entry. |
| **Possible duplicates** | Entries sharing a date, an amount and a budget line, grouped together. |
| **Waiting too long** | Pending for more than seven days. |

Each list holds at most 100 rows. There is no date filter on this screen — it reads the
whole book.

---

## Reports

Totals over any date range. All roles.

| Control | What it does |
|---|---|
| **From** / **To** | The range. Nothing changes until you press Show range. |
| **Show range** | Applies the dates. |
| **This month** / **Last month** / **This quarter** / **This year** | One-click ranges. |
| **Download Excel** | Downloads the whole report as one `.xlsx` workbook — a sheet per table, with a styled header row, thousands separators, real dates and percentages. |

**The five figures:** Opening balance · Money in · Money out · Net · **Current balance**
(shown as **Closing balance** when the range ends in the past). The balance is emphasised
and carries the count of approved entries, plus anything still pending in that range.

Each panel becomes a sheet in the downloaded workbook:

| Panel | What it shows | Its sheet holds |
|---|---|---|
| **Spending by budget line** | Red bars, largest first, each with its share of total spending. Where the line has a monthly budget, the caption compares actual against budget for the range. | Budget line, entries, amount, share %, budget for range |
| **Income by budget line** | The same in green. | Budget line, entries, amount, share % |
| **Payment methods** | A table splitting each method by direction. | Method, direction, entries, amount |
| **Month by month** | A table of money in, money out and net per month. | Month, entries, money in, money out, net |

The workbook opens on a **Summary** sheet carrying the range, the currency, the five figures
and the pending count, so the file explains itself away from the app. All four panels count
**approved entries only**, which is why report totals reconcile exactly with the ledger's
closing balance for the same range.

---

## Settings

Reachable from the sidebar by APR and ADM, and by anyone through the profile chip in the
header. What you see depends on your role.

### Your account — everyone

| Control | What it does |
|---|---|
| **Current password** | Your existing password. |
| **New password** | At least 8 characters. |
| **Change password** | Applies it. You stay signed in; the new password works from the next sign-in. |

### Budget lines — ADM only

| Control | What it does |
|---|---|
| **New line** | The name of the line to add. |
| **Kind** | Expense or Income. Decides which direction of entry can use it. |
| **Monthly budget** | Optional. Feeds the budget-against-actual comparison in Reports. |
| **Add line** | Creates it. Disabled until a name is typed. |
| **Edit** (per row) | Turns the name and budget into editable boxes. |
| **Save** / **Cancel** | Commits or abandons that edit. |
| **Deactivate** / **Restore** | Takes the line out of the entry form, or puts it back. Past entries keep it either way. |

A line that any entry uses cannot be deleted; the system will tell you to deactivate it
instead. Renaming is safe — the audit trail keeps the old name against the entries that used
it.

### People — ADM only

| Control | What it does |
|---|---|
| **Name**, **Email**, **Role**, **First password** | The new person's details. The line under the form describes what the chosen role can do. |
| **Add person** | Creates the account. Hand the first password over in person. |
| **Role** (per row) | Changes that person's role immediately. Disabled on your own row. |
| **Reset password** | Opens a box for a new password, then **Reset password** confirms. Disabled under 8 characters. |
| **Deactivate** / **Restore** | Stops or restores that person's ability to sign in. Disabled on your own row. |

The table also shows each person's email and when they last signed in. You cannot change
your own role or deactivate yourself — that is what stops the last administrator locking
everyone out.

### Close a month — APR and ADM

| Control | What it does |
|---|---|
| **Month** | The month to close. Offers the last 12, marking any already closed. |
| **Cash you counted** | What you physically counted. Leave empty if you are not reconciling cash. |
| **Note** | Anything worth recording about this close. |
| **Close March** (the button names the month) | Closes it. Reads "March is already closed" and stays disabled if it is. |
| **Reopen** (per closed month) | Reopens that month. ADM only, and logged. |

Before you confirm, four figures appear: **Book balance** (what the system says), **Counted**
(what you say), **Variance** (counted − book, green over, red under) and **Still pending**.

Closing is refused while anything in that month is pending, and the message tells you how
many. The table underneath lists every closed month with its balance, count, variance, who
closed it and when.

---

## Where each rule is enforced

Buttons you cannot use are hidden, but hiding is a convenience, not the control. Every rule
below is checked on the server when the request arrives, so it holds no matter how the
request is made.

| Rule | Enforced |
|---|---|
| Auditors cannot record or edit entries | Server |
| Nobody approves their own entry | Server |
| Accountants edit only their own pending entries | Server |
| Rejecting and voiding require a reason | Server |
| Editing a reviewed entry returns it to pending | Server |
| Nothing dated in a closed month can change | Server |
| A month with pending entries cannot be closed | Server |
| The audit trail cannot be edited or deleted | No route exists to do it |
| You cannot demote or deactivate yourself | Server |

# UR Binary Hub Finance — Screen Reference

Every screen, every control, what each one does and who can use it. This is the
look-it-up companion to [MANUAL.md](MANUAL.md), which explains *why* the system works the
way it does. If you want to understand the rules, read the manual. If you want to know what
a particular button does, you are in the right place.

**Roles are abbreviated throughout:** ACC accountant · AUD auditor · ADM administrator ·
VIE viewer.

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
| **Audit trail** | Every logged action. | AUD ADM VIE |
| **Exceptions** | The six checks. | AUD ADM VIE |
| **Reports** | Totals over a date range. | All |
| **Settings** | Budget lines, people, month close. | AUD ADM |
| **Your name and role** (bottom) | Not a control — it confirms who you are signed in as. | All |
| **Password** | Jumps to Settings → Your account. This is how an accountant or viewer reaches Settings at all. | All |
| **Sign out** | Ends the session and returns to Sign in. | All |

Accountants do not see Audit trail or Exceptions. Both are reviewer screens, and hiding
them keeps the accountant's sidebar to the work they actually do.

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
| **Closing balance** | Opening + in − out. The headline figure, with the count of approved entries beneath it. |
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
| **Recorded by** | Narrows to one person. | AUD ADM VIE |
| **Search** | Matches the description, payee, reference and note. | All |
| **Find** | Runs the search. | All |
| **Clear filters** | Appears once something beyond the dates is set. Resets everything except the date range. | All |

**Anything beyond a date filter hides the Balance column**, and the bar says so. A running
balance over a filtered selection would be arithmetic that means nothing.

### Toolbar

| Control | What it does | Who sees it |
|---|---|---|
| **Entry count** (left) | How many entries match, and how many of those are still pending and what they are worth. | All |
| **Export CSV** | Downloads exactly the rows on screen, amounts as bare numbers. Disabled when there is nothing to export. | All |
| **Import a sheet** | Opens the spreadsheet import dialog. | ACC ADM |
| **Record entry** | Opens the entry form. | ACC ADM |

### The table

| Column | What it holds |
|---|---|
| **Date** | The date the money moved. An amber bar on this edge means pending. |
| **Description** | What the entry is for, with payee · reference · budget line beneath. A voided or rejected entry shows its reason here, and an edited one is marked "Edited after review". |
| **Method** | Cash, mobile money, bank or other. |
| **Status** | The badge. |
| **Money in** | Green, filled only for money in. |
| **Money out** | Red, filled only for money out. |
| **Balance** | The running balance after this entry, in its own tinted lane. Approved rows only — everything else shows a dash. Hidden entirely when filters are active. |

The first row is the **opening balance** for the range.

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
| **Budget line** | Only lines matching the direction appear: income lines for money in, expense lines for money out. Starts as "Choose a line". |
| **Description** | Required, up to 300 characters. This is what the auditor reads first. |
| **Paid to** / **Received from** | The label follows the direction. |
| **Method** | Cash, Mobile money, Bank, Other. Defaults to Cash. |
| **Reference** | Receipt number or mobile money transaction ID. |
| **Receipt link** | A URL to a photo of the receipt. The system stores the link, not the image. |
| **Note** | Up to 500 characters, for anything the auditor should know. |

| Control | What it does |
|---|---|
| **Cancel** | Closes without saving. |
| **Record entry** / **Save changes** | Saves. A new entry is created as pending. |
| **Void this entry** | Only on an existing entry. Opens a reason box; **Void this entry** confirms, **Keep it** backs out. A reason is required. |

The dialog tells you what will happen before you commit: a new entry says it waits for an
auditor, and an edit says that changing a reviewed entry sends it back to the queue.

Leave the reference and receipt link empty on an expense and the entry is flagged under
Exceptions. It still saves — this is a prompt, not a block.

---

## Import a sheet

Opened by **Import a sheet** on the Ledger. ACC and ADM only.

| Control | What it does |
|---|---|
| **Download template** | Downloads a CSV with the right column headings and two filled-in example rows, using your own budget lines. Opens in Excel. |
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

The review queue. Everyone can see it; only AUD and ADM can act.

Entries are listed oldest first. The line under the title says how many are waiting and by
how much they would move the balance.

**What each card shows:** description and amount, then date · budget line · method · payee;
who recorded it, how long ago, and the exact timestamp; the reference if there is one; and
the note if there is one.

| Element | When it appears |
|---|---|
| **Open the receipt** (link) | The entry has a receipt link. Opens it in a new tab. |
| **No receipt reference and no receipt link** (amber) | An expense with neither. It cannot be verified later. |
| **Re-submitted after edit** (amber) | It was reviewed before and has changed since, so the earlier decision no longer applies. |

| Control | What it does | Who sees it |
|---|---|---|
| **Approve** | Approves immediately. The balance moves by that amount from this moment. | AUD ADM |
| **Reject** | Opens the reason box. | AUD ADM |
| **Cancel** / **Reject entry** (in the box) | Back out, or confirm the rejection. A reason is required — **Reject entry** stays disabled until you type one. | AUD ADM |

If you recorded the entry yourself, the buttons are replaced by *"You recorded this one, so
another reviewer has to clear it."* Accountants and viewers see *"An auditor reviews this
one."*

Empty queue: *"Nothing waiting. The accountant is up to date."*

Voiding is not on this screen. Open the entry from the Ledger to void it.

---

## Audit trail

Every logged action, newest first. AUD, ADM and VIE. Read-only, for everyone.

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

Six checks over the book. AUD, ADM and VIE. An accountant who reaches this address sees a
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

**The five figures:** Opening balance · Money in · Money out · Net · Closing balance. The
closing balance is emphasised and carries the count of approved entries, plus anything still
pending in that range.

| Panel | What it shows | Its CSV button exports |
|---|---|---|
| **Spending by budget line** | Red bars, largest first, each with its share of total spending. Where the line has a monthly budget, the caption compares actual against budget for the range. | Budget line, entries, amount, share %, budget for range |
| **Income by budget line** | The same in green. | Budget line, entries, amount, share % |
| **Payment methods** | A table splitting each method by direction. | Method, direction, entries, amount |
| **Month by month** | A table of money in, money out and net per month. | Month, entries, money in, money out, net |

Every CSV button is disabled when its table is empty. All four panels count **approved
entries only**, which is why report totals reconcile exactly with the ledger's closing
balance for the same range.

---

## Settings

Reachable from the sidebar by AUD and ADM, and from the **Password** link by anyone. What
you see depends on your role.

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

### Close a month — AUD and ADM

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

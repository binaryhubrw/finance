import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { exceptions } from '@/lib/queries';
import { money } from '@/lib/format';
import { OVERSIGHT_ROLES } from '@/lib/enums';
import { Section, EntryList, DuplicateList } from '@/components/ExceptionSections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExceptionsPage({ searchParams }) {
  const user = await requireUser();

  if (!OVERSIGHT_ROLES.includes(user.role)) {
    return (
      <div className="card px-5 py-8">
        <p className="eyebrow">Exceptions</p>
        <h1 className="page-title mt-1">This section is for reviewers</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          It lists the entries a reviewer should look at twice. Keep receipt references on every
          expense and most of it stays empty.
        </p>
      </div>
    );
  }

  await db();
  const sp = (await searchParams) ?? {};
  const one = (value) => (Array.isArray(value) ? value[0] : (value ?? ''));
  const range = { from: one(sp.from), to: one(sp.to) };

  const found = await exceptions(range);
  const totalFlagged =
    found.missingReceipt.length +
    found.editedAfterReview.length +
    found.largeAmounts.length +
    found.backdated.length +
    found.possibleDuplicates.length +
    found.staleUnapproved.length;

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">Exceptions</p>
        <h1 className="page-title mt-1">What to look at twice</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          {totalFlagged === 0
            ? 'Nothing is flagged. The book is clean for this range.'
            : 'Six checks run over the book. Each row links back to the ledger.'}
        </p>
      </header>

      <Section
        title="Missing receipt"
        why="An expense with no receipt reference cannot be verified later."
        count={found.missingReceipt.length}
      >
        <EntryList entries={found.missingReceipt} />
      </Section>

      <Section
        title="Edited after review"
        why="These entries changed after someone had already reviewed them, so the earlier decision no longer applies."
        count={found.editedAfterReview.length}
      >
        <EntryList entries={found.editedAfterReview} />
      </Section>

      <Section
        title="Large amounts"
        why={`Anything at or above ${money(found.threshold)} deserves a second signature.`}
        count={found.largeAmounts.length}
      >
        <EntryList entries={found.largeAmounts} />
      </Section>

      <Section
        title="Backdated"
        why="Recorded more than seven days after the date on the entry, so the paperwork trail may be thin."
        count={found.backdated.length}
      >
        <EntryList entries={found.backdated} />
      </Section>

      <Section
        title="Possible duplicates"
        why="Entries sharing a date, an amount and a budget line are often the same payment recorded twice."
        count={found.possibleDuplicates.length}
      >
        <DuplicateList groups={found.possibleDuplicates} />
      </Section>

      <Section
        title="Waiting too long"
        why="Pending for more than seven days. The balance is understated until these are cleared."
        count={found.staleUnapproved.length}
      >
        <EntryList entries={found.staleUnapproved} />
      </Section>
    </div>
  );
}

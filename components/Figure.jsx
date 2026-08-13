import Link from 'next/link';
import Money from '@/components/Money';

/**
 * One stat per card. `feature` gives the headline figure a tinted panel so the
 * closing balance reads first without needing a bigger number.
 */
export default function Figure({
  label,
  value,
  tone = 'plain',
  size = 'lg',
  note,
  href,
  feature = false,
}) {
  const body = (
    <>
      <p className="label">{label}</p>
      <p className="mt-2.5">
        <Money value={value} tone={tone} size={feature ? 'xl' : size} />
      </p>
      {note ? <p className="mt-1.5 text-[12px] text-ink-soft">{note}</p> : null}
    </>
  );

  const shell = `card px-4 py-4 ${feature ? 'tint-accent border-accent/15' : ''}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${shell} block transition-shadow duration-140 hover:shadow-lift`}
      >
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}

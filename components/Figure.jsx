import Link from 'next/link';
import Money from '@/components/Money';

/** A single stat: mono label above, tabular figure below. No card grid, no shadows. */
export default function Figure({ label, value, tone = 'plain', size = 'lg', note, href }) {
  const body = (
    <>
      <p className="label">{label}</p>
      <p className="mt-2">
        <Money value={value} tone={tone} size={size} />
      </p>
      {note ? <p className="mt-1 text-[12px] text-ink-soft">{note}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block border-l border-rule px-4 py-3 transition-colors duration-120 first:border-l-0 hover:bg-sunk"
      >
        {body}
      </Link>
    );
  }

  return <div className="border-l border-rule px-4 py-3 first:border-l-0">{body}</div>;
}

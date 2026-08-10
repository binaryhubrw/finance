import { money } from '@/lib/format';

const TONE = {
  in: 'text-credit',
  out: 'text-debit',
  plain: 'text-ink',
  quiet: 'text-muted',
};

/**
 * Every figure in the app goes through here: mono, tabular, right aligned.
 * Green and red carry meaning — they only ever mark the direction money moved.
 */
export default function Money({ value, tone = 'plain', size = 'md', className = '', prefix }) {
  const sizes = {
    sm: 'text-[12px]',
    md: 'text-[13px]',
    lg: 'text-[18px]',
    xl: 'text-[22px]',
  };

  return (
    <span className={`num ${TONE[tone] ?? TONE.plain} ${sizes[size]} ${className}`}>
      {prefix}
      {money(value)}
    </span>
  );
}

'use client';

import { useState } from 'react';
import { BrandMark } from '@/components/Icons';

/**
 * The UR Binary Hub mark. The artwork lives at `public/brand/logo.png` rather
 * than in code, so it can be replaced without touching a component.
 *
 * Both places it appears sit on the dark blue panel, and the supplied mark is
 * blue on white, so it is set on a white tile. That also means an opaque and a
 * transparent source file both look deliberate.
 *
 * If the file is missing the drawn mark stands in, so a forgotten asset costs a
 * little polish rather than a broken image in the sidebar.
 */
export default function Logo({ size = 34, className = '', plate = true }) {
  const [missing, setMissing] = useState(false);

  if (missing) return <BrandMark size={size} className={className} />;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed-size local
    // asset gains nothing from the image pipeline, and this needs an onError.
    <img
      src="/brand/logo.png"
      alt="UR Binary Hub"
      width={size}
      height={size}
      onError={() => setMissing(true)}
      className={plate ? 'block h-full w-full object-contain' : `block shrink-0 ${className}`}
    />
  );

  if (!plate) return image;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ${className}`}
      style={{ width: size, height: size }}
    >
      {image}
    </span>
  );
}

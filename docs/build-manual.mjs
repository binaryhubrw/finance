/**
 * Builds docs/manual.html from docs/manual.template.html, inlining the two
 * webfonts as data URIs. The published page has no network access, so the faces
 * have to travel with it — these are the same files next/font already fetched
 * for the app, so the manual and the product set in the same type.
 *
 *   npm run build && node docs/build-manual.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const media = join(here, '..', '.next', 'static', 'media');

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

// next/font hashes the filenames, so read the @font-face rules it generated
// rather than guessing which file is which face.
const built = walk(join(here, '..', '.next'));
const woff2 = new Set(
  built.filter((path) => path.endsWith('.woff2')).map((path) => path.split('/').pop()),
);
const css = built
  .filter((path) => path.endsWith('.css'))
  .map((path) => readFileSync(path, 'utf8'))
  .join('');

const findFace = (family, weight) => {
  const pattern = new RegExp(
    `font-family:${family};[^}]*font-weight:${weight}[; ][^}]*media/([a-z0-9._-]+\\.woff2)`,
    'g',
  );
  const candidates = [...css.matchAll(pattern)].map((match) => match[1]).filter((n) => woff2.has(n));

  // Each family is emitted once per unicode subset. "-s.p." marks the one
  // next/font preloads, which is latin — the only subset this page needs.
  const hit = candidates.find((name) => name.includes('-s.p.'));
  if (!hit) {
    throw new Error(
      `Could not find the latin ${family} ${weight} face in the built CSS. Run npm run build first.`,
    );
  }
  return readFileSync(join(media, hit)).toString('base64');
};

const html = readFileSync(join(here, 'manual.template.html'), 'utf8')
  .replace('__SANS__', findFace('Instrument Sans', 400))
  .replace('__MONO400__', findFace('IBM Plex Mono', 400))
  .replace('__MONO500__', findFace('IBM Plex Mono', 500));

const unreplaced = html.match(/__[A-Z0-9_]+__/g);
if (unreplaced) throw new Error(`Unreplaced placeholders: ${unreplaced.join(', ')}`);

writeFileSync(join(here, 'manual.html'), html);
console.log(`docs/manual.html — ${(Buffer.byteLength(html) / 1024).toFixed(0)}KB`);

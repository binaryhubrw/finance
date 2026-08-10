import { inflateRawSync } from 'node:zlib';

/**
 * A minimal reader for the spreadsheet formats an accountant actually sends:
 * .xlsx straight out of Excel, Numbers or Google Sheets, and .csv.
 *
 * An .xlsx file is a ZIP of XML parts, and Node can already inflate and parse
 * both, so this stays a dependency-free file rather than pulling in a library.
 * It reads values only — formatting, formulas and charts are ignored.
 */

/* ------------------------------------------------------------------ zip */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

function findEndOfCentralDirectory(buffer) {
  // The comment field can push the record up to 64KB from the end.
  const earliest = Math.max(0, buffer.length - 22 - 0xffff);
  for (let i = buffer.length - 22; i >= earliest; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/** Returns { 'xl/worksheets/sheet1.xml': Buffer, … } */
export function unzip(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) {
    throw new Error('That file is not a spreadsheet Excel can open. Save it as .xlsx or .csv.');
  }

  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const files = {};

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) break;

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);

    // The local header repeats the name and extra fields at its own lengths.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(start, start + compressedSize);

    if (method === 0) files[name] = raw;
    else if (method === 8) files[name] = inflateRawSync(raw);
    // Anything else (bzip2, lzma) is not something Excel writes; skip it.

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

/* ------------------------------------------------------------------ xml */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decode = (text) =>
  text.replace(/&(amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);/g, (match, code) => {
    if (ENTITIES[code]) return ENTITIES[code];
    const number = code[1] === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : match;
  });

/** All text inside <t> tags, joined — covers both plain and rich-text runs. */
const textOf = (xml) =>
  [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

function sharedStrings(files) {
  const part = files['xl/sharedStrings.xml'];
  if (!part) return [];
  return [...part.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
}

/** "BC" -> 54 (zero-based) */
function columnIndex(reference) {
  const letters = /^([A-Z]+)/.exec(reference)?.[1] ?? 'A';
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

/** The first sheet in the workbook's own order, not whatever the zip lists first. */
function firstSheetPath(files) {
  const workbook = files['xl/workbook.xml']?.toString('utf8');
  const rels = files['xl/_rels/workbook.xml.rels']?.toString('utf8');

  if (workbook && rels) {
    const id = /<sheet[^>]*r:id="([^"]+)"/.exec(workbook)?.[1];
    if (id) {
      const pattern = new RegExp(`<Relationship[^>]*Id="${id}"[^>]*Target="([^"]+)"`);
      const target = pattern.exec(rels)?.[1];
      if (target) {
        const path = target.startsWith('/')
          ? target.slice(1)
          : `xl/${target.replace(/^\.\//, '')}`;
        if (files[path]) return path;
      }
    }
  }

  const sheets = Object.keys(files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort();
  return sheets[0];
}

/** Reads the first worksheet as a grid of trimmed strings. */
export function readXlsx(buffer) {
  const files = unzip(buffer);
  const path = firstSheetPath(files);
  if (!path) throw new Error('That workbook has no worksheet in it.');

  const strings = sharedStrings(files);
  const sheet = files[path].toString('utf8');
  const rows = [];

  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const type = /t="([^"]+)"/.exec(attributes)?.[1];
      const reference = /r="([A-Z]+\d+)"/.exec(attributes)?.[1];
      const index = reference ? columnIndex(reference) : cells.length;

      let value = '';
      if (type === 's') {
        const position = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]);
        value = strings[position] ?? '';
      } else if (type === 'inlineStr') {
        value = textOf(body);
      } else {
        value = decode(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '');
      }

      cells[index] = String(value).trim();
    }
    // Self-closing <row/> for a blank line yields nothing; keep the position.
    rows.push(Array.from(cells, (cell) => cell ?? ''));
  }

  return rows;
}

/* ------------------------------------------------------------------ csv */

/** Excel writes ; instead of , in locales where the decimal mark is a comma. */
function sniffDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const outside = firstLine.split('"').filter((_, i) => i % 2 === 0).join('');
  return (outside.match(/;/g)?.length ?? 0) > (outside.match(/,/g)?.length ?? 0) ? ';' : ',';
}

export function readCsv(text) {
  const body = text.replace(/^﻿/, '');
  const delimiter = sniffDelimiter(body);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < body.length; i += 1) {
    const character = body[i];

    if (quoted) {
      if (character === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (character === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (field !== '' || row.length) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

/** Dispatches on the file name, falling back to the ZIP magic number. */
export function readSpreadsheet(buffer, filename = '') {
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (/\.xlsx$/i.test(filename) || isZip) return readXlsx(buffer);
  if (/\.xls$/i.test(filename)) {
    throw new Error(
      'The old .xls format is not supported. Open it in Excel and save it as .xlsx or .csv.',
    );
  }
  return readCsv(buffer.toString('utf8'));
}

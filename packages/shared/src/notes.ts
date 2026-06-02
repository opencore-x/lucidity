export interface ParsedNote {
  data: Record<string, unknown>;
  body: string;
}

const OPEN_RE = /^---[ \t]*\r?\n/;
const CLOSE_RE = /^---[ \t]*(?:\r?\n|$)/m;

/**
 * Splits a markdown note into its YAML-ish frontmatter and body. Pure and
 * dependency-free (no `node:fs`, no YAML lib) so it is safe to import from
 * mobile. The opening `---` must be the very first line, so a `---` rule in
 * the middle of a note is never mistaken for frontmatter. Lenient: anything it
 * cannot parse falls back to an opaque `{ data: {}, body: raw }`.
 */
export function parseFrontmatter(raw: string): ParsedNote {
  const open = OPEN_RE.exec(raw);
  if (!open) return { data: {}, body: raw };

  const afterOpen = raw.slice(open[0].length);
  const close = CLOSE_RE.exec(afterOpen);
  if (!close) return { data: {}, body: raw };

  const fmText = afterOpen.slice(0, close.index).replace(/\r?\n$/, '');
  const body = afterOpen.slice(close.index + close[0].length);
  try {
    return { data: parseYamlLite(fmText), body };
  } catch {
    return { data: {}, body: raw };
  }
}

/** Frontmatter `title` → first `# H1` → filename without extension. */
export function noteTitle(raw: string, filename: string): string {
  const { data, body } = parseFrontmatter(raw);
  const title = data['title'];
  if (typeof title === 'string' && title.trim()) return title.trim();
  const h1 = /^#\s+(.+)$/m.exec(body);
  if (h1?.[1]) return h1[1].trim();
  return filename.replace(/\.md$/i, '');
}

function parseYamlLite(src: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let currentKey: string | null = null;

  for (const line of src.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentKey) {
      const arr = Array.isArray(data[currentKey]) ? (data[currentKey] as unknown[]) : [];
      arr.push(parseScalar(listItem[1] ?? ''));
      data[currentKey] = arr;
      continue;
    }

    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) {
      const key = kv[1] as string;
      const rest = kv[2] ?? '';
      if (rest === '') {
        data[key] = '';
        currentKey = key; // a block list may follow
      } else {
        data[key] = parseScalar(rest);
        currentKey = null;
      }
    }
  }

  return data;
}

function parseScalar(value: string): unknown {
  const s = value.trim();
  if (s === '') return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return inner ? inner.split(',').map((x) => parseScalar(x)) : [];
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

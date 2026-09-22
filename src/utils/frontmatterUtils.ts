export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ParsedContent {
  frontmatter: Frontmatter | null;
  body: string;
}

export function parseFrontmatter(content: string): ParsedContent {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };

  const raw = match[1];
  const body = match[2].trimStart();
  const frontmatter: Frontmatter = {};

  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key) continue;

    if (val.startsWith('[') && val.endsWith(']')) {
      frontmatter[key] = val
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      frontmatter[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }

  return { frontmatter, body };
}

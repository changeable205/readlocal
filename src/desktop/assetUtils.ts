import { convertFileSrc } from '@tauri-apps/api/core';

export function isWindowsPlatform(): boolean {
  return /windows/i.test(navigator.userAgent);
}

function decodeSafe(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Resolve `.` / `..` across a list of path segments. */
function normalize(segments: string[]): string[] {
  const out: string[] = [];
  for (const seg of segments) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop();
      else out.push('..');
    } else {
      out.push(seg);
    }
  }
  return out;
}

/**
 * Resolve an image reference found in a Markdown document to an absolute disk
 * path and return a Tauri asset-protocol URL. Remote / data / blob / asset URLs
 * are returned unchanged.
 *
 * @param mdAbsPath Absolute path of the Markdown file (images are relative to it).
 */
export function resolveImageSrc(mdAbsPath: string, href: string): string {
  const h = href.trim();
  if (/^(https?:|data:|blob:|asset:)/i.test(h)) return h;

  const win = isWindowsPlatform();
  const sep = win ? '\\' : '/';

  if (h.startsWith('/') && !win) {
    // POSIX absolute reference.
    const abs = '/' + normalize(decodeSafe(h).split('/')).join('/');
    return convertFileSrc(abs);
  }

  const base = mdAbsPath.replace(/[\\/][^\\/]*$/, '');
  const baseSegs = base.split(/[\\/]/);
  const refSegs = decodeSafe(h).replace(/^\.?\//, '').split('/');
  const joined = normalize([...baseSegs, ...refSegs]).join(sep);
  const abs = win ? joined : '/' + joined;
  return convertFileSrc(abs);
}

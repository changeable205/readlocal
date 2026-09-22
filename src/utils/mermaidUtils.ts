import mermaid from 'mermaid';

let initializedTheme: string | null = null;
let sequence = 0;

function ensureInitialized(dark: boolean): void {
  const theme = dark ? 'dark' : 'default';
  if (initializedTheme === theme) return;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: 'strict',
    fontFamily: "'Inter', system-ui, sans-serif",
  });
  initializedTheme = theme;
}

/**
 * Transform every `<div class="mermaid">` placeholder inside `root`
 * into an inline SVG. Runs entirely offline (mermaid is bundled, no CDN).
 * Errors in a single diagram are isolated and shown as a code block.
 */
export async function renderMermaidIn(root: HTMLElement, dark: boolean): Promise<void> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('div.mermaid'));
  if (nodes.length === 0) return;

  ensureInitialized(dark);

  for (const node of nodes) {
    if (node.dataset.mermaidProcessed === 'true') continue;
    const code = node.textContent ?? '';
    const id = `mmd-${sequence++}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const { svg } = await mermaid.render(id, code);
      node.innerHTML = svg;
      node.dataset.mermaidProcessed = 'true';
      node.removeAttribute('data-processed');
    } catch (err) {
      node.dataset.mermaidProcessed = 'true';
      node.classList.add('rl-mermaid-error');
      node.innerHTML = `<pre>${code}</pre>`;
      console.warn('[mermaid] render failed:', err);
    }
  }
}

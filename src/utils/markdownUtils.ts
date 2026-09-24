import { marked, Renderer, type TokenizerExtension, type RendererExtension } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { renderToString } from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render a TeX string to KaTeX HTML (never throw on a malformed formula). */
function renderTex(tex: string, displayMode: boolean): string {
  try {
    return renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

// Block math:  $$ ... $$
const mathBlock: TokenizerExtension & RendererExtension = {
  name: 'mathBlock',
  level: 'block',
  start(src: string) {
    return src.indexOf('$$');
  },
  tokenizer(src: string) {
    const m = /^\$\$([\s\S]+?)\$\$(?:[ \t]*\n)?/.exec(src);
    if (m) {
      return { type: 'mathBlock', raw: m[0], tex: m[1].trim() };
    }
    return undefined;
  },
  renderer(token: { tex?: string }) {
    return `<div class="rl-math-block">${renderTex(token.tex ?? '', true)}</div>`;
  },
};

// Inline math:  $ ... $  (not followed by a digit, to avoid currency like $5)
const mathInline: TokenizerExtension & RendererExtension = {
  name: 'mathInline',
  level: 'inline',
  start(src: string) {
    return src.indexOf('$');
  },
  tokenizer(src: string) {
    const m = /^\$([^\n$]+?)\$(?![\d,])/.exec(src);
    if (m) {
      return { type: 'mathInline', raw: m[0], tex: m[1] };
    }
    return undefined;
  },
  renderer(token: { tex?: string }) {
    return renderTex(token.tex ?? '', false);
  },
};

const renderer = new Renderer();

renderer.code = function ({ text, lang }) {
  // Mermaid diagrams are rendered client-side after sanitization by mermaid.run().
  if (lang && lang.toLowerCase() === 'mermaid') {
    return `<div class="rl-mermaid mermaid">${escapeHtml(text)}</div>`;
  }

  const language = lang && hljs.getLanguage(lang) ? lang : null;
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value;
  const langClass = language ? ` language-${language}` : '';
  return `<div class="rl-code-block"><pre><code class="hljs${langClass}">${highlighted}</code></pre></div>`;
};

marked.use({ renderer, breaks: true, gfm: true, extensions: [mathBlock, mathInline] });

// Content-addressed cache: identical source reuses HTML, edited source misses.
const renderCache = new Map<string, string>();
const CACHE_LIMIT = 80;

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const href = node.getAttribute('href');
  if (href !== null && !/^(https?:|mailto:|#|\/)/i.test(href)) {
    node.removeAttribute('href');
  }

  const src = node.getAttribute('src');
  // Keep local relative/absolute images and data URIs; only strip executable
  // schemes. Local <img> src is resolved to the asset protocol by the component.
  if (src !== null && /^\s*(javascript|vbscript)\s*:/i.test(src)) {
    node.removeAttribute('src');
  }

  if (node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(content: string, cacheKey?: string): string {
  const key = cacheKey ?? content;
  if (renderCache.has(key)) {
    return renderCache.get(key)!;
  }

  const raw = marked.parse(content, { async: false }) as string;
  if (typeof raw !== 'string') {
    throw new Error('marked.parse did not return a string');
  }

  const html = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'h1','h2','h3','h4','h5','h6','p','br','hr',
      'strong','em','del','code','pre','blockquote',
      'ul','ol','li','a','img','table','thead','tbody','tr','th','td',
      'div','span','sup','sub','details','summary',
    ],
    // 'class' for hljs/mermaid/KaTeX; 'style' for KaTeX vertical alignment.
    ALLOWED_ATTR: ['href','src','alt','title','class','target','rel','start','style','aria-hidden','role'],
    FORBID_ATTR: ['id','onclick','onerror','onload','onmouseover'],
    FORBID_TAGS: ['script','iframe','object','embed'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  });

  if (renderCache.size >= CACHE_LIMIT) {
    renderCache.delete(renderCache.keys().next().value!);
  }
  renderCache.set(key, html);

  return html;
}

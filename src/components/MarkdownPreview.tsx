import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, ALargeSmall, List, X, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { MarkdownFile, Theme, FontSize, ReadingWidth } from '../types';
import { renderMarkdown } from '../utils/markdownUtils';
import { renderMermaidIn } from '../utils/mermaidUtils';
import { parseFrontmatter } from '../utils/frontmatterUtils';
import { resolveImageSrc } from '../desktop/assetUtils';

interface MarkdownPreviewProps {
  file: MarkdownFile;
  theme: Theme;
  fontSize: FontSize;
  readingWidth: ReadingWidth;
  tocEnabled: boolean;
  showControls: boolean;
  onFontSizeChange: (size: FontSize) => void;
  onWidthChange: (w: ReadingWidth) => void;
  onTocToggle: () => void;
}

type Heading = { level: number; text: string; id: string };

function extractHeadings(html: string): Heading[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    .map((el, i) => ({
      level: parseInt(el.tagName[1], 10),
      text: el.textContent?.trim() ?? '',
      id: `rl-h-${i}`,
    }))
    .filter(h => h.text.length > 0);
}

const fontSizeOrder: FontSize[] = ['sm', 'md', 'lg'];
const fontSizeLabel: Record<FontSize, string> = { sm: 'S', md: 'M', lg: 'L' };
const fontSizeClass: Record<FontSize, string> = { sm: 'prose-sm', md: 'prose-md', lg: 'prose-lg' };

const widthOrder: ReadingWidth[] = ['narrow', 'medium', 'wide', 'full'];
const widthMaxClass: Record<ReadingWidth, string> = {
  narrow: 'max-w-[580px]',
  medium: 'max-w-[740px]',
  wide:   'max-w-[960px]',
  full:   'max-w-full',
};
const widthLabel: Record<ReadingWidth, string> = {
  narrow: 'XS',
  medium: 'S',
  wide:   'M',
  full:   'L',
};

export default function MarkdownPreview({
  file, theme, fontSize, readingWidth, tocEnabled, showControls, onFontSizeChange, onWidthChange, onTocToggle,
}: MarkdownPreviewProps) {
  const dark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const parsed = useMemo(() => parseFrontmatter(file.content), [file.content]);
  const html = useMemo(() => renderMarkdown(parsed.body), [parsed.body]);
  const headings = useMemo(() => extractHeadings(html), [html]);

  // Reset scroll and search when switching files
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setSearchQuery('');
    setMatchCount(0);
    setCurrentMatch(0);
  }, [file.id]);

  // Inject copy buttons into every .rl-code-block after render
  useEffect(() => {
    const article = containerRef.current?.querySelector('[data-printable]');
    if (!article) return;

    article.querySelectorAll('.rl-copy-btn').forEach(btn => btn.remove());

    article.querySelectorAll('.rl-code-block').forEach(block => {
      const codeEl = block.querySelector('code');
      if (!codeEl) return;

      let langLabel = '';
      codeEl.classList.forEach(cls => {
        if (cls.startsWith('language-')) {
          const raw = cls.slice('language-'.length);
          langLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
        }
      });

      const btn = document.createElement('button');
      btn.className = 'rl-copy-btn';
      btn.setAttribute('aria-label', 'Copy code');
      btn.textContent = langLabel ? `Copy ${langLabel}` : 'Copy';

      btn.addEventListener('click', () => {
        if (codeEl instanceof HTMLElement) {
          navigator.clipboard.writeText(codeEl.innerText).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('rl-copied');
            setTimeout(() => {
              btn.textContent = langLabel ? `Copy ${langLabel}` : 'Copy';
              btn.classList.remove('rl-copied');
            }, 2000);
          }).catch(() => {});
        }
      });

      block.appendChild(btn);
    });
  }, [html]);

  // Inject IDs onto heading elements so ToC links can scroll to them
  useEffect(() => {
    const article = containerRef.current?.querySelector('[data-printable]');
    if (!article) return;
    article.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el, i) => {
      if (el instanceof HTMLElement) {
        el.id = `rl-h-${i}`;
      }
    });
  }, [html]);

  // Render Mermaid diagrams after the sanitized HTML is injected.
  useEffect(() => {
    const article = containerRef.current?.querySelector('[data-printable]');
    if (!article) return;
    renderMermaidIn(article as HTMLElement, dark).catch((err) => {
      console.warn('Mermaid render error:', err);
    });
  }, [html, dark]);

  // Resolve local (relative) image references against the Markdown file's
  // directory and load them through the Tauri asset protocol.
  useEffect(() => {
    const article = containerRef.current?.querySelector('[data-printable]');
    if (!article) return;
    article.querySelectorAll('img').forEach((img) => {
      const raw = img.getAttribute('src');
      if (!raw) return;
      try {
        const url = resolveImageSrc(file.id, raw);
        if (url && img.getAttribute('src') !== url) img.src = url;
      } catch { /* ignore bad refs */ }
    });
  }, [html, file.id]);

  // Keyboard shortcut: Ctrl+F / Cmd+F to open search, Escape to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus search input when search opens
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Highlight matching text in the article
  useEffect(() => {
    const article = containerRef.current?.querySelector('[data-printable]') as HTMLElement | null;
    if (!article) return;

    // Unwrap any existing highlights
    article.querySelectorAll('mark.rl-highlight').forEach(mark => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });
    article.normalize();

    const q = searchQuery.trim();
    if (!q || !searchOpen) {
      setMatchCount(0);
      return;
    }

    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const ranges: Range[] = [];
    const lower = q.toLowerCase();

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.nodeValue ?? '';
      const lowerText = text.toLowerCase();
      let pos = 0;
      let idx: number;
      while ((idx = lowerText.indexOf(lower, pos)) !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + q.length);
        ranges.push(range);
        pos = idx + 1;
      }
    }

    // Wrap in reverse order so earlier range positions stay valid
    [...ranges].reverse().forEach(range => {
      const mark = document.createElement('mark');
      mark.className = 'rl-highlight';
      try { range.surroundContents(mark); } catch { /* skip cross-element spans */ }
    });

    setMatchCount(ranges.length);
    setCurrentMatch(0);
  }, [searchQuery, html, searchOpen]);

  // Update active highlight when currentMatch changes
  useEffect(() => {
    const article = containerRef.current?.querySelector('[data-printable]') as HTMLElement | null;
    if (!article) return;
    const marks = article.querySelectorAll('mark.rl-highlight');
    marks.forEach((m, i) => m.classList.toggle('rl-highlight-active', i === currentMatch));
    const active = marks[currentMatch] as HTMLElement | undefined;
    active?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatch, matchCount]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
  }

  function nextMatch() {
    if (matchCount === 0) return;
    setCurrentMatch(c => (c + 1) % matchCount);
  }

  function prevMatch() {
    if (matchCount === 0) return;
    setCurrentMatch(c => (c - 1 + matchCount) % matchCount);
  }

  function scrollToHeading(id: string) {
    containerRef.current?.querySelector(`#${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function decreaseFont() {
    const i = fontSizeOrder.indexOf(fontSize);
    if (i > 0) onFontSizeChange(fontSizeOrder[i - 1]);
  }
  function increaseFont() {
    const i = fontSizeOrder.indexOf(fontSize);
    if (i < fontSizeOrder.length - 1) onFontSizeChange(fontSizeOrder[i + 1]);
  }

  const maxClass = widthMaxClass[readingWidth];
  const isFull = readingWidth === 'full';
  const fm = parsed.frontmatter;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">

      {/* ── Find in document bar ── */}
      {searchOpen && (
        <div className={`
          absolute top-3 left-1/2 -translate-x-1/2 z-40 print:hidden
          flex items-center gap-2 px-3 py-2 rounded-2xl border
          shadow-[0_4px_24px_rgba(0,0,0,0.15)] backdrop-blur-sm
          transition-colors duration-300
          ${dark ? 'bg-ink-900/95 border-white/[0.08]' : 'bg-white/95 border-ink-200/70'}
        `}>
          <Search size={13} className={dark ? 'text-ink-500' : 'text-ink-400'} strokeWidth={2} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentMatch(0); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  prevMatch();
                } else {
                  nextMatch();
                }
              }
              if (e.key === 'Escape') {
                closeSearch();
              }
            }}
            placeholder="Find in document…"
            className={`
              w-52 text-[13px] font-sans bg-transparent outline-none
              ${dark ? 'text-cream-200 placeholder:text-ink-600' : 'text-ink-800 placeholder:text-ink-300'}
            `}
          />
          {searchQuery && (
            <span className={`text-[11px] font-sans tabular-nums whitespace-nowrap ${dark ? 'text-ink-500' : 'text-ink-400'}`}>
              {matchCount === 0 ? 'No results' : `${currentMatch + 1} / ${matchCount}`}
            </span>
          )}
          <div className="flex items-center gap-0.5">
            <button
              onClick={prevMatch}
              disabled={matchCount === 0}
              aria-label="Previous match"
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-30 ${dark ? 'hover:bg-white/[0.08] text-ink-400' : 'hover:bg-ink-100 text-ink-500'}`}
            >
              <ChevronUp size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={nextMatch}
              disabled={matchCount === 0}
              aria-label="Next match"
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-30 ${dark ? 'hover:bg-white/[0.08] text-ink-400' : 'hover:bg-ink-100 text-ink-500'}`}
            >
              <ChevronDown size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={closeSearch}
              aria-label="Close search"
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-150 ${dark ? 'hover:bg-white/[0.08] text-ink-400 hover:text-cream-200' : 'hover:bg-ink-100 text-ink-500 hover:text-ink-800'}`}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable reading area */}
      <div
        ref={containerRef}
        data-preview-scroll
        className={`flex-1 overflow-y-auto transition-colors duration-300 ${dark ? 'bg-ink-950' : 'bg-cream-50'}`}
      >
        <div
          className={`
            mx-auto transition-all duration-300
            px-6 sm:px-10 py-12 sm:py-16 min-h-full
            ${maxClass}
            ${!isFull
              ? dark
                ? 'bg-ink-950'
                : 'bg-white shadow-[1px_0_0_rgba(0,0,0,0.04),-1px_0_0_rgba(0,0,0,0.04)]'
              : dark ? 'bg-ink-950' : 'bg-white'
            }
          `}
        >
          {/* Pure rendered content — no file path breadcrumb/divider so the
              preview top aligns exactly with the source pane. */}

          {/* ── Frontmatter metadata header ── */}
          {fm && (
            <div className={`mb-8 pb-8 border-b ${dark ? 'border-white/[0.06]' : 'border-ink-100'}`}>
              {fm.title && (
                <h1
                  className={`text-3xl font-bold mb-3 leading-tight ${dark ? 'text-cream-100' : 'text-ink-900'}`}
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {fm.title as string}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {fm.date && (
                  <span className={`text-[12px] font-sans ${dark ? 'text-ink-500' : 'text-ink-400'}`}>
                    {String(fm.date)}
                  </span>
                )}
                {Array.isArray(fm.tags) && fm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(fm.tags as string[]).map(tag => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-sans font-medium ${dark ? 'bg-teal-900/40 text-teal-400 border border-teal-500/20' : 'bg-teal-50 text-teal-700 border border-teal-200/60'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {Object.entries(fm)
                  .filter(([k]) => !['title', 'date', 'tags'].includes(k))
                  .map(([k, v]) =>
                    v !== undefined && v !== '' ? (
                      <span key={k} className={`text-[12px] font-sans ${dark ? 'text-ink-600' : 'text-ink-400'}`}>
                        <span className={`font-medium ${dark ? 'text-ink-500' : 'text-ink-500'}`}>{k}:</span>{' '}
                        {String(v)}
                      </span>
                    ) : null
                  )}
              </div>
            </div>
          )}

          <article
            data-printable
            className={`${fontSizeClass[fontSize]} ${dark ? 'prose-reading-dark' : 'prose-reading'} animate-fade-in`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="h-24" />
        </div>
      </div>

      {/* ── Table of Contents panel ── */}
      {tocEnabled && headings.length > 0 && (
        <div className={`
          hidden lg:flex print:hidden flex-col flex-shrink-0
          w-52 overflow-y-auto border-l transition-colors duration-300
          ${dark ? 'bg-ink-950 border-white/[0.06]' : 'bg-white border-ink-100'}
        `}>
          <div className={`
            sticky top-0 flex items-center justify-between
            px-4 py-3 flex-shrink-0 border-b backdrop-blur-sm
            font-sans text-[10px] font-semibold uppercase tracking-[0.08em]
            ${dark ? 'bg-ink-950/90 border-white/[0.06] text-ink-600' : 'bg-white/90 border-ink-100 text-ink-300'}
          `}>
            <span>Contents</span>
            <button
              onClick={onTocToggle}
              aria-label="Close table of contents"
              className={`
                w-5 h-5 flex items-center justify-center rounded-md
                transition-all duration-150
                ${dark ? 'hover:bg-white/[0.08] hover:text-cream-200' : 'hover:bg-ink-100 hover:text-ink-700'}
              `}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </div>
          <nav className="py-2">
            {headings.map(h => (
              <button
                key={h.id}
                onClick={() => scrollToHeading(h.id)}
                style={{ paddingLeft: `${Math.min(h.level - 1, 3) * 12 + 16}px` }}
                title={h.text}
                className={`
                  w-full text-left py-1 pr-4 block truncate
                  font-sans text-[11px] leading-snug transition-colors duration-100
                  ${h.level === 1
                    ? dark ? 'text-ink-300 font-semibold' : 'text-ink-600 font-semibold'
                    : dark ? 'text-ink-500' : 'text-ink-400'}
                  ${dark ? 'hover:text-cream-200' : 'hover:text-ink-800'}
                `}
              >
                {h.text}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── Floating control panel — right edge (hidden when ToC is open) ── */}
      <div className={`
        flex-col items-center gap-2
        absolute right-4 top-1/2 -translate-y-1/2 z-20
        ${!showControls || tocEnabled ? 'hidden' : 'hidden lg:flex'}
        rounded-2xl border p-2
        backdrop-blur-sm transition-colors duration-300 select-none
        ${dark
          ? 'bg-ink-900/85 border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
          : 'bg-white/92 border-ink-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.10)]'
        }
      `}>

        {/* ── ToC toggle ── */}
        {headings.length > 0 && (
          <div className={`flex flex-col items-center w-full pb-2 border-b ${dark ? 'border-white/[0.06]' : 'border-ink-100'}`}>
            <button
              onClick={onTocToggle}
              aria-label={tocEnabled ? 'Disable table of contents' : 'Enable table of contents'}
              aria-pressed={tocEnabled}
              title="Table of contents"
              className={`
                w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150
                ${tocEnabled
                  ? dark ? 'bg-teal-600 text-white shadow-[0_2px_8px_rgba(20,184,166,0.45)]'
                         : 'bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.35)]'
                  : dark ? 'text-ink-500 hover:text-ink-200 hover:bg-white/[0.07]'
                         : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100'
                }
              `}
            >
              <List size={12} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ── Font size section ── */}
        <div className={`flex flex-col items-center gap-0.5 w-full pb-2 border-b ${dark ? 'border-white/[0.06]' : 'border-ink-100'}`}>
          <div className={`py-1 ${dark ? 'text-ink-600' : 'text-ink-300'}`}>
            <ALargeSmall size={13} strokeWidth={1.75} />
          </div>
          <button
            onClick={increaseFont}
            disabled={fontSize === 'lg'}
            aria-label="Increase font size"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed ${dark ? 'hover:bg-white/[0.08] text-ink-400 hover:text-cream-200' : 'hover:bg-ink-100 text-ink-400 hover:text-ink-800'}`}
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
          <div className={`flex flex-col items-center gap-0.5 py-0.5 px-0.5 rounded-xl ${dark ? 'bg-white/[0.03]' : 'bg-ink-50'}`}>
            {fontSizeOrder.map((s) => (
              <button
                key={s}
                onClick={() => onFontSizeChange(s)}
                aria-label={`Font size ${s}`}
                aria-pressed={fontSize === s}
                className={`
                  w-7 h-7 flex items-center justify-center rounded-lg
                  text-[10px] font-sans font-bold uppercase tracking-wide
                  transition-all duration-150
                  ${fontSize === s
                    ? dark
                      ? 'bg-teal-600 text-white shadow-[0_2px_8px_rgba(20,184,166,0.45)]'
                      : 'bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.35)]'
                    : dark
                      ? 'text-ink-500 hover:text-ink-200 hover:bg-white/[0.07]'
                      : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100'
                  }
                `}
              >
                {fontSizeLabel[s]}
              </button>
            ))}
          </div>
          <button
            onClick={decreaseFont}
            disabled={fontSize === 'sm'}
            aria-label="Decrease font size"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed ${dark ? 'hover:bg-white/[0.08] text-ink-400 hover:text-cream-200' : 'hover:bg-ink-100 text-ink-400 hover:text-ink-800'}`}
          >
            <Minus size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Reading width section ── */}
        <div className="flex flex-col items-center gap-0.5 w-full pt-0.5">
          <div className={`py-1 text-[9px] font-sans font-semibold uppercase tracking-[0.08em] ${dark ? 'text-ink-700' : 'text-ink-300'}`}>
            WIDTH
          </div>
          <div className={`flex flex-col items-center gap-0.5 py-0.5 px-0.5 rounded-xl ${dark ? 'bg-white/[0.03]' : 'bg-ink-50'}`}>
            {widthOrder.map((w) => (
              <button
                key={w}
                onClick={() => onWidthChange(w)}
                aria-label={`Width ${w}`}
                aria-pressed={readingWidth === w}
                title={w.charAt(0).toUpperCase() + w.slice(1)}
                className={`
                  w-7 h-7 flex items-center justify-center rounded-lg
                  transition-all duration-150
                  ${readingWidth === w
                    ? dark
                      ? 'bg-teal-600 text-white shadow-[0_2px_8px_rgba(20,184,166,0.45)]'
                      : 'bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.35)]'
                    : dark
                      ? 'text-ink-500 hover:text-ink-200 hover:bg-white/[0.07]'
                      : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100'
                  }
                `}
              >
                <span className="text-[9px] font-sans font-bold uppercase tracking-wide">
                  {widthLabel[w]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

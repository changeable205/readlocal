import { useEffect, useRef, useCallback } from 'react';
import { Code2, BookOpenText } from 'lucide-react';
import { Theme, FontSize, ReadingWidth, MarkdownFile } from '../types';
import MarkdownPreview from '../components/MarkdownPreview';

interface SplitProps {
  file: MarkdownFile;
  theme: Theme;
  fontSize: FontSize;
  readingWidth: ReadingWidth;
  /** Live edits from the source pane (drives the right-hand preview). */
  onEdit: (text: string) => void;
  /** Persist the current document (Cmd/Ctrl+S). */
  onSave: () => void;
}

/**
 * Same-file split: editable raw Markdown source on the left, live rendered
 * preview on the right, with proportional bidirectional scroll sync.
 */
export default function SourcePreviewSplit({ file, theme, fontSize, readingWidth, onEdit, onSave }: SplitProps) {
  const dark = theme === 'dark';
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  // Timestamp until which scroll events are treated as our own programmatic
  // echoes (time-window lock prevents the two panes from oscillating).
  const lockUntil = useRef(0);
  const LOCK_MS = 80;
  // Which pane the user is actively scrolling (used to re-sync after re-render).
  const activePane = useRef<'source' | 'preview'>('source');
  // rAF coalescing so high-frequency scroll events produce one smooth update.
  const rafSource = useRef(0);
  const rafPreview = useRef(0);

  const getPreviewScroller = useCallback((): HTMLElement | null => {
    return previewWrapRef.current?.querySelector<HTMLElement>('[data-preview-scroll]') ?? null;
  }, []);

  const applyToPreview = useCallback(() => {
    const src = sourceRef.current;
    const prev = getPreviewScroller();
    if (!src || !prev) return;
    const srcMax = src.scrollHeight - src.clientHeight;
    const prevMax = prev.scrollHeight - prev.clientHeight;
    if (srcMax <= 0 || prevMax <= 0) { prev.scrollTop = 0; return; }
    prev.scrollTop = (src.scrollTop / srcMax) * prevMax;
  }, [getPreviewScroller]);

  const applyToSource = useCallback(() => {
    const src = sourceRef.current;
    const prev = getPreviewScroller();
    if (!src || !prev) return;
    const prevMax = prev.scrollHeight - prev.clientHeight;
    const srcMax = src.scrollHeight - src.clientHeight;
    if (prevMax <= 0 || srcMax <= 0) { if (src) src.scrollTop = 0; return; }
    src.scrollTop = (prev.scrollTop / prevMax) * srcMax;
  }, [getPreviewScroller]);

  const onSourceScroll = useCallback(() => {
    if (performance.now() < lockUntil.current) return;
    activePane.current = 'source';
    cancelAnimationFrame(rafSource.current);
    rafSource.current = requestAnimationFrame(() => {
      lockUntil.current = performance.now() + LOCK_MS;
      applyToPreview();
    });
  }, [applyToPreview]);

  const onPreviewScroll = useCallback(() => {
    if (performance.now() < lockUntil.current) return;
    activePane.current = 'preview';
    cancelAnimationFrame(rafPreview.current);
    rafPreview.current = requestAnimationFrame(() => {
      lockUntil.current = performance.now() + LOCK_MS;
      applyToSource();
    });
  }, [applyToSource]);

  // Attach a native scroll listener to the preview's internal scroller.
  useEffect(() => {
    const scroller = getPreviewScroller();
    if (!scroller) return;
    scroller.addEventListener('scroll', onPreviewScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onPreviewScroll);
  }, [getPreviewScroller, onPreviewScroll, file.id]);

  // Reset scroll position when switching files.
  useEffect(() => {
    if (sourceRef.current) sourceRef.current.scrollTop = 0;
    const prev = getPreviewScroller();
    if (prev) prev.scrollTop = 0;
    activePane.current = 'source';
  }, [file.id, getPreviewScroller]);

  // Live edits change the preview height; re-apply the mapping so the panes
  // stay aligned while typing.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (activePane.current === 'preview') applyToSource(); else applyToPreview();
    });
    return () => cancelAnimationFrame(id);
  }, [file.content, applyToPreview, applyToSource]);

  const monoFontStyle = {
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
    fontSize: fontSize === 'sm' ? '13px' : fontSize === 'lg' ? '15px' : '14px',
    lineHeight: '1.6',
  } as const;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Editable raw source pane */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden border-r transition-colors duration-300">
        <div
          className={`px-4 py-2 border-b text-[11px] font-sans font-medium uppercase tracking-[0.06em] flex items-center gap-1.5 ${
            dark ? 'bg-ink-900 border-white/[0.05] text-ink-500' : 'bg-cream-100 border-ink-200/60 text-ink-400'
          }`}
        >
          <Code2 size={11} strokeWidth={2} />
          Markdown Source
          <span className={`ml-auto normal-case tracking-normal ${dark ? 'text-ink-600' : 'text-ink-300'}`}>⌘/Ctrl+S to save</span>
        </div>
        <textarea
          ref={sourceRef}
          value={file.content}
          onChange={(e) => onEdit(e.target.value)}
          onScroll={onSourceScroll}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              onSave();
            }
          }}
          spellCheck={false}
          aria-label="Editable Markdown source"
          className={`
            w-full flex-1 min-h-0 p-6 resize-none font-mono text-sm leading-relaxed
            focus:outline-none transition-colors duration-300
            ${dark ? 'bg-ink-950 text-ink-200' : 'bg-white text-ink-800'}
          `}
          style={monoFontStyle}
        />
      </div>

      {/* Live rendered preview pane */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <div
          className={`px-4 py-2 border-b text-[11px] font-sans font-medium uppercase tracking-[0.06em] flex items-center gap-1.5 ${
            dark ? 'bg-ink-900 border-white/[0.05] text-ink-500' : 'bg-cream-100 border-ink-200/60 text-ink-400'
          }`}
        >
          <BookOpenText size={11} strokeWidth={2} />
          Rendered Preview
        </div>
        <div ref={previewWrapRef} className="flex flex-1 min-h-0 overflow-hidden">
          <MarkdownPreview
            file={file}
            theme={theme}
            fontSize={fontSize}
            readingWidth={readingWidth}
            tocEnabled={false}
            showControls={false}
            onFontSizeChange={() => {}}
            onWidthChange={() => {}}
            onTocToggle={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

/** Full-width editable raw source view (ViewMode === 'source'). */
export function EditableSource({ file, theme, fontSize, onEdit, onSave }: {
  file: MarkdownFile;
  theme: Theme;
  fontSize: FontSize;
  onEdit: (text: string) => void;
  onSave: () => void;
}) {
  const dark = theme === 'dark';
  return (
    <textarea
      value={file.content}
      onChange={(e) => onEdit(e.target.value)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          onSave();
        }
      }}
      spellCheck={false}
      aria-label="Editable Markdown source"
      className={`
        w-full flex-1 min-h-0 p-8 resize-none font-mono text-sm leading-relaxed
        focus:outline-none transition-colors duration-300
        ${dark ? 'bg-ink-950 text-ink-200' : 'bg-white text-ink-800'}
      `}
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
        fontSize: fontSize === 'sm' ? '13px' : fontSize === 'lg' ? '15px' : '14px',
        lineHeight: '1.6',
      }}
    />
  );
}

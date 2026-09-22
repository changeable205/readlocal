import { invoke } from '@tauri-apps/api/core';
import katexCss from 'katex/dist/katex.min.css?inline';
import { isTauri } from './tauriApi';

function browserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STANDALONE_CSS = `
:root { color-scheme: light; }
body { margin:0; background:#fff; color:#1c1915; font-family: Georgia,'Lora',serif; line-height:1.8; }
article { max-width:780px; margin:0 auto; padding:48px 32px 80px; font-size:15px; }
article h1 { font-size:2em; font-weight:700; line-height:1.2; margin:0 0 .6em; }
article h2 { font-size:1.45em; font-weight:700; margin:1.4em 0 .5em; }
article h3 { font-size:1.2em; font-weight:700; margin:1.2em 0 .4em; }
article p { margin:.7em 0; }
article a { color:#0f766e; }
article blockquote { margin:1em 0; padding:.4em 1em; border-left:3px solid #d0c9bf; color:#524940; }
article ul,article ol { padding-left:1.6em; margin:.6em 0; }
article code { font-family:'JetBrains Mono',Menlo,monospace; font-size:.88em; background:#f4ede0; padding:.15em .4em; border-radius:4px; }
article pre { background:#1c1915; color:#f4ede0; padding:16px; border-radius:10px; overflow-x:auto; }
article pre code { background:none; padding:0; color:inherit; }
article table { border-collapse:collapse; width:100%; margin:1em 0; }
article th,article td { border:1px solid #d0c9bf; padding:6px 12px; text-align:left; }
article th { background:#faf7ef; }
article img,article svg { max-width:100%; }
article .rl-mermaid,article .mermaid { text-align:center; margin:1em 0; }
article .rl-math-block { margin:1.1em 0; overflow-x:auto; }
.hljs-comment,.hljs-quote{color:#9a8f80}.hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:#e8bc50}
.hljs-string,.hljs-attr{color:#9ec489}.hljs-number,.hljs-literal{color:#d19a66}.hljs-title,.hljs-section{color:#7fb3d5}
.hljs-name,.hljs-tag{color:#e06c75}.hljs-attribute{color:#d19a66}.hljs-variable,.hljs-template-variable{color:#e06c75}
`;

/** Build a fully self-contained HTML document from the live rendered article. */
function standaloneHtml(title: string, article: HTMLElement, extraCss = ''): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>${STANDALONE_CSS}</style>
<style>${katexCss}</style>
${extraCss ? `<style>${extraCss}</style>` : ''}
</head>
<body><article>${article.innerHTML}</article></body></html>`;
}

/** Export the live rendered article (KaTeX + Mermaid already inline) as standalone .html. */
export async function exportHtml(fileName: string, article: HTMLElement | null): Promise<void> {
  if (!article) throw new Error('Nothing rendered to export');
  const base = fileName.replace(/\.(md|markdown|mdx|txt)$/i, '');
  const doc = standaloneHtml(base, article);
  const outName = `${base}.html`;
  if (isTauri()) {
    // Tauri v2 maps JS camelCase keys onto the snake_case Rust command args.
    await invoke<string | null>('save_text_dialog', {
      defaultName: outName,
      filterLabel: 'HTML',
      filterExt: 'html',
      contents: doc,
    });
  } else {
    browserDownload(outName, new Blob([doc], { type: 'text/html' }));
  }
}

/**
 * Export a real, selectable-text PDF. The Rust side hands a self-contained HTML
 * document to a native WKWebView (takePDFSnapshot), which performs proper paged
 * layout — text stays vector/selectable and lines are never sliced in half.
 */
export async function exportPdf(fileName: string, _theme: 'light' | 'dark'): Promise<void> {
  const live = document.querySelector('[data-printable]') as HTMLElement | null;
  if (!live) throw new Error('Nothing rendered to export');
  const base = fileName.replace(/\.(md|markdown|mdx|txt)$/i, '');
  // Emulate a browser's A4 print: fill the 794px-wide page while reserving
  // side/top space equivalent to the browser's default print margins so line
  // wrapping matches "print exported HTML to PDF".
  const printCss = 'article{max-width:none !important; padding:40px 70px 56px !important;}';
  const html = standaloneHtml(base, live, printCss);

  if (isTauri()) {
    if (/windows/i.test(navigator.userAgent)) {
      // Windows WebView2 implements window.print() (Edge print dialog); the
      // app's @media print CSS hides all chrome and prints just the article.
      // Choose "Microsoft Print to PDF" for a selectable-text PDF.
      window.print();
      return;
    }
    // macOS: native offscreen WebKit pipeline (WKWebView cannot window.print).
    await invoke<string | null>('html_to_pdf_dialog', {
      defaultName: `${base}.pdf`,
      html,
    });
  } else {
    // Browser fallback: open the document and let the user print to PDF.
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }
}

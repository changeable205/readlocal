# ReadLocal — Your Private Markdown Reader

> **Zero uploads. Zero accounts. Zero tracking.**
> Everything stays on your device, always.

---

## What is ReadLocal?

ReadLocal is a **beautiful, offline-first Markdown reader** that runs entirely inside your browser. Open `.md` files instantly — no server, no cloud, no waiting.

Perfect for:

- 📁 Reading your personal notes and journals
- 💻 Browsing project documentation and READMEs
- 📚 Viewing your Obsidian or Notion exports
- 🗂️ Exploring entire folders of Markdown files

---

## Getting Started

### 1. Add your files

Drag and drop `.md` files — or an **entire folder** — anywhere onto the app. You can also click the **Add** button in the sidebar to browse for files.

### 2. Navigate the Index

Your files appear in the **Index panel** on the left, organized in the same folder structure you dropped. Click any file to open it instantly.

### 3. Read comfortably

Use the floating controls on the **right edge** of the reader to fine-tune your experience:

| Control | What it does |
|---|---|
| `A−` / `A+` | Shrink or grow the font size |
| `⟷` | Switch between narrow, medium, and wide reading widths |
| `☀ / ☾` | Toggle light and dark mode |

---

## Features at a Glance

### Privacy First
Your files **never leave your device**. ReadLocal processes everything locally — no network requests, no analytics, no ads.

### Syntax Highlighting
Fenced code blocks are automatically highlighted for dozens of languages:

```javascript
// JavaScript example
const greet = (name) => `Hello, ${name}!`;
console.log(greet("world"));
```

```python
# Python example
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

### Full Markdown Support

ReadLocal renders the complete Markdown spec:

- **Bold**, *italic*, and ~~strikethrough~~ text
- `Inline code` and multi-line code blocks
- Blockquotes, tables, and horizontal rules
- Ordered and unordered lists
- Headings from H1 through H6

### Works Offline
Install ReadLocal as a **Progressive Web App (PWA)** — look for the install prompt in your browser's address bar. Once installed, it works even with no internet connection.

---

## Tips & Tricks

> **Tip:** Hover over any file in the sidebar and click the small **×** that appears to remove it from the list — without deleting the original file.

> **Tip:** Use the **search bar** at the top of the sidebar to instantly filter files by name across your entire collection.

> **Tip:** On mobile, the sidebar hides automatically after you select a file, giving you a full-screen reading view.

---

## Keyboard Shortcuts

| Action | How |
|---|---|
| Open / close sidebar | Click the sidebar icon in the header |
| Remove a file | Hover the file → click **×** |
| Search files | Click the search bar or start typing |

---

## Supported File Types

| Format | Extension | Notes |
|---|---|---|
| Markdown | `.md` | Full GFM support |
| Folders | any | Drag a whole folder — structure is preserved |

---

*ReadLocal is built with React, Vite, and Tailwind CSS. It uses `marked` for Markdown parsing and `highlight.js` for code syntax highlighting.*

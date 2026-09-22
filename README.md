# ReadLocal Desktop

本地优先的 macOS Markdown 阅读器 / 轻量编辑器，由开源网页项目 ReadLocal（markdown.readlocal.app）用 **Tauri 2** 改造为原生桌面应用。所有文件只在本机读取，**不上传网络**。

## 功能

- **三栏视图**：文件树 / 源码 / 渲染预览，支持 Split（左源码、右实时预览）、Source、Preview 三种模式。
- **Split 左侧可编辑**：边打字右侧边渲染；`⌘S / Ctrl+S` 直接保存回磁盘原文件。
- **本地文件夹 + 原生文件树**：递归读取磁盘目录，侧边栏按真实层级展开（保留所有子文件夹）。
- **Markdown 渲染**：GFM、代码高亮（highlight.js）、Mermaid 图、**KaTeX 数学公式**（`$...$` 行内、`$$...$$` 块级，离线内置字体）。
- **双向同步滚动**（requestAnimationFrame 节流 + 时间窗锁，防震荡）。
- **导出**
  - HTML：单文件、样式/字体自包含，离线可开。
  - PDF：**矢量、文字可选中可复制**，按行级边界分页（不会把一行字切成两半），输出标准 **A4（595.28 × 841.88 pt）**。底层用系统 WebKit（`WKWebView.createPDF` + PDFKit 合并 + CoreGraphics 缩放），不是截图贴图。
- **文件监听**：外部改动 `.md` 自动刷新。
- **`.md/.markdown/.mdx` 文件关联**：Finder 双击直接用本 App 打开。
- Intel（x86_64）原生可运行，最低系统 macOS 11（Big Sur）。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite 5 + Tailwind CSS |
| Markdown | marked、dompurify、highlight.js、mermaid、katex |
| 桌面壳 | Tauri 2（Rust） |
| 原生能力 | `tauri-plugin-dialog`（保存框）、`notify`（文件监听）、`rfd` |
| PDF | Swift 内嵌辅助程序（WebKit / PDFKit / CoreGraphics），构建时由 `build.rs` 用 swiftc 编译并 `include_bytes!` 进主程序 |

## 目录结构（要点）

```
readlocal-desktop/
├─ src/
│  ├─ desktop/            # 桌面壳专用：主界面、顶栏、侧边栏、Tauri API、导出
│  │  ├─ DesktopApp.tsx
│  │  ├─ DesktopHeader.tsx
│  │  ├─ DesktopSidebar.tsx
│  │  ├─ SourcePreviewSplit.tsx
│  │  ├─ exportUtils.ts
│  │  └─ tauriApi.ts
│  ├─ components/          # MarkdownPreview / Toast / EmptyPreview
│  ├─ utils/               # markdown、mermaid、frontmatter 等
│  ├─ polyfills.ts         # Big Sur 老 WKWebView 的 ES API polyfill
│  └─ main.tsx
└─ src-tauri/
   ├─ src/main.rs          # Tauri 命令：扫描目录/读写文件/保存框/HTML→PDF
   ├─ html2pdf.swift       # 原生 PDF 辅助程序源码
   ├─ makeicon.swift       # 应用图标生成器（可选）
   ├─ build.rs             # 构建时编译 html2pdf.swift 并嵌入
   ├─ icons/               # tauri icon 生成的全套图标
   └─ tauri.conf.json
```

### Tauri 命令（Rust 用 snake_case，前端 invoke 多词参数用 camelCase）

| 命令 | 作用 |
|---|---|
| `scan_directory { root }` | 递归扫描目录，返回文件树 |
| `read_text_file { path }` | 读文本 |
| `write_text_file { path, contents }` | 写文本（⌘S 保存） |
| `get_launch_file()` | 取双击关联文件路径 |
| `save_text_dialog { defaultName, filterLabel, filterExt, contents }` | 原生保存框写文本（HTML） |
| `html_to_pdf_dialog { defaultName, html }` | 原生 PDF：内嵌 Swift 引擎渲染→A4→保存框 |

后端 → 前端事件：`fs-changed { kind, path }`（文件监听）、`open-file`（Finder 双击）。

## 环境依赖（构建机）

- **Node.js ≥ 18**（开发用 Node 20）+ npm
- **Rust 稳定版**（rustup，stable-x86_64-apple-darwin）
- **Xcode Command Line Tools**，需含 Apple clang 与 Swift 5.4+
  - 安装：`xcode-select --install`
  - 注意：本机 Swift 5.4.2 与 MacOSX12.x SDK 的 `.swiftinterface` 不兼容，`build.rs` 会自动选用 **MacOSX11.3.sdk** 编译 `html2pdf.swift`（部署目标 macos11.0）。如路径不同，可改 `build.rs` 中的 SDK 解析逻辑。
- 目标架构：Intel x86_64（在 Intel Mac 上直接构建即产出 x86_64；在 Apple Silicon 上需加 `--target x86_64-apple-darwin` 并装对应 target）。

## 安装与开发

```bash
cd readlocal-desktop
npm install
npm run tauri:dev      # 开发模式（热更前端）
```

## 编译打包

```bash
cd readlocal-desktop
npm install
npm run tauri:build
```

产物：

- App：`src-tauri/target/release/bundle/macos/ReadLocal Desktop.app`
- DMG：`src-tauri/target/release/bundle/dmg/ReadLocal Desktop_1.0.0_x64.dmg`

### 签名（本地分发必需，否则他人打开会被 Gatekeeper 拦）

Tauri 本地产物默认**未签名**，分发前做 ad-hoc 签名：

```bash
APP="src-tauri/target/release/bundle/macos/ReadLocal Desktop.app"
codesign --force --deep -s - "$APP"
open -n "$APP"
```

> ad-hoc 签名只能本机/Local 网络分发；另一台 Mac 首次打开若被拦，在 App 上右键「打开」一次，或「系统设置 → 隐私与安全性」里点「仍要打开」。正式对外分发需要 Apple Developer ID 签名 + 公证。

### 打成 zip

```bash
cd src-tauri/target/release/bundle/macos
ditto -c -k --keepParent "ReadLocal Desktop.app" "ReadLocal-Desktop-1.0.0-x86_64.zip"
```

## 在另一台 Mac 上安装

1. 拿到 `.dmg`（双击拖入「应用程序」）或 `.zip`（解压后把 `.app` 拖进「应用程序」）。
2. 首次打开如被 Gatekeeper 拦截：右键 App →「打开」→ 确认。
3. 设为 `.md` 默认打开方式：右键任一 `.md` 文件 →「显示简介」→「打开方式」选 ReadLocal Desktop →「全部更改」。

## 重新生成图标（可选）

```bash
cd src-tauri
swiftc -suppress-warnings -sdk "$(xcrun --sdk macosx11.3 --show-sdk-path)" \
  -target x86_64-apple-macos11.0 -framework AppKit -framework Foundation \
  makeicon.swift -o /tmp/makeicon
/tmp/makeicon icons/source-1024.png
cd .. && npx tauri icon src-tauri/icons/source-1024.png
```

## 已知边界

- PDF 走离屏 WebKit，复杂分页以「行」为最小断点；超长不可断的单行代码块可能占较大块。
- 文件关联角色为 Viewer；编辑能力仅在 Split/Source 视图内提供并需手动 ⌘S 保存。

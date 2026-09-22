# 在 Windows 10 上构建 / 安装 ReadLocal Desktop

Tauri 的 Windows 包需要 **Windows + MSVC 工具链**，无法在 macOS 上直接交叉编译并验证。两条路线任选。

## 路线 A：GitHub Actions 云端构建（推荐，本机无需 Windows 工具链）

仓库已含 `.github/workflows/build-windows.yml`。

1. 在 GitHub 新建一个仓库（可设为 Private），把 **`readlocal-desktop` 目录的内容作为仓库根目录**提交：
   ```bash
   cd readlocal-desktop
   git init
   git add .
   git commit -m "readlocal desktop 1.0.0"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
   > `.gitignore` 建议包含 `node_modules/`、`src-tauri/target/`、`dist/`。
2. 打开仓库网页 → **Actions** 标签 → 左侧选 **build-windows** → 右侧 **Run workflow**。
3. 约 10–15 分钟构建完成，点进该次运行，在底部 **Artifacts** 下载 `ReadLocal-Desktop-1.0.0-windows`（zip，内含）：
   - NSIS 安装程序：`*-setup.exe`（推荐，体积小，会自动处理 WebView2）
   - MSI 安装程序：`*.msi`

## 路线 B：在一台 Windows 10 机器上本地构建

1. 安装 **Node.js 20 LTS**（https://nodejs.org）。
2. 安装 **Rust（MSVC 版）**：https://rustup.rs → 默认 `x86_64-pc-windows-msvc`。
3. 安装 **Visual Studio C++ Build Tools**：Visual Studio Installer 勾选
   “使用 C++ 的桌面开发（Desktop development with C++）”（含 MSVC、Windows 10 SDK）。
4. **WebView2 Runtime**：Win10 一般随 Edge 已装；没有就装 “Evergreen Standalone Installer”。
5. 构建：
   ```powershell
   cd readlocal-desktop
   npm install
   npm run tauri:build
   ```
   产物：
   - `src-tauri\target\release\bundle\nsis\*-setup.exe`
   - `src-tauri\target\release\bundle\msi\*.msi`

## 安装与使用

- 双击 `*-setup.exe`（NSIS）按向导安装；若提示 WebView2，按提示联网安装（一次性）。
- PDF 导出：Windows 下点 PDF 会弹出系统打印框，选择 **“Microsoft Print to PDF”** 即可得到文字可选中、原生分页的 PDF（应用的打印样式会自动隐藏顶栏/侧栏）。
- HTML 导出与 macOS 一致（单文件、自包含）。

## 跨平台说明

- macOS 的 PDF 走内嵌 Swift/WebKit 引擎（`html_to_pdf_dialog`，仅 macOS 编译）。
- Windows 不编译该命令，前端按 `navigator.userAgent` 自动改用 `window.print()`。
- `src-tauri/build.rs` 只在 macOS 编译 Swift 辅助工具；Windows 上自动跳过。

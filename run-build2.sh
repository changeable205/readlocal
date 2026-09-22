#!/bin/bash
# Incremental rebuild (frontend changed; Rust deps already compiled)
export PATH=/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.cargo/bin:$PATH
PROJ="/Users/zhibo/Doubao/chats/2026-09-07/new-chat/readlocal-desktop"
cd "$PROJ" || exit 99
/usr/bin/pkill -f "readlocal-desktop" 2>/dev/null
/bin/sleep 1
{
  echo "=== REBUILD START $(date) ==="
  npm run tauri:build
  echo "=== BUILD_DONE_EXIT=$? $(date) ==="
} > build2.log 2>&1

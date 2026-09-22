#!/bin/bash
# Universal (x86_64 + arm64) release build
export PATH=/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.cargo/bin:$PATH
PROJ="/Users/zhibo/Doubao/chats/2026-09-07/new-chat/readlocal-desktop"
cd "$PROJ" || exit 99
/usr/bin/pkill -f "readlocal-desktop" 2>/dev/null
/bin/sleep 1
{
  echo "=== UNIVERSAL BUILD START $(date) ==="
  npm run tauri:build -- --target universal-apple-darwin
  echo "=== BUILD_DONE_EXIT=$? $(date) ==="
} > build-uni.log 2>&1

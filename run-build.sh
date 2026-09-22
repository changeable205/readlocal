#!/bin/bash
# Tauri release build for ReadLocal Desktop (Intel x86_64 native)
export PATH=/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.cargo/bin:$PATH
PROJ="/Users/zhibo/Doubao/chats/2026-09-07/new-chat/readlocal-desktop"
cd "$PROJ" || exit 99
{
  echo "=== BUILD START $(date) ==="
  echo "rustc: $(rustc --version)"
  echo "host:  $(rustc -vV | grep host)"
  echo "clang: $(xcrun clang --version 2>/dev/null | head -1)"
  echo "sdk:   $(xcrun --show-sdk-path 2>/dev/null)"
  npm run tauri:build
  echo "=== BUILD_DONE_EXIT=$? $(date) ==="
} > build.log 2>&1

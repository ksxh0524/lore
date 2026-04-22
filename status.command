#!/bin/bash

# Lore 状态检查脚本
# 双击此文件查看 Lore 服务状态

set -e

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

osascript <<EOF
tell application "Terminal"
    do script "cd '$SCRIPT_DIR' && ./manager.sh status && exit"
    activate
end tell
EOF

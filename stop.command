#!/bin/bash

# Lore 停止脚本
# 双击此文件即可停止 Lore 服务

set -e

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

osascript <<EOF
tell application "Terminal"
    do script "cd '$SCRIPT_DIR' && ./manager.sh stop && exit"
    activate
end tell
EOF

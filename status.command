#!/bin/bash

# Lore 状态检查脚本
# 双击此文件查看 Lore 服务状态

cd "$(dirname "$0")"

osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)'; ./manager.sh status; echo ''; echo '按回车键关闭此窗口...'; read"
    activate
end tell
EOF

#!/bin/bash

# Lore 重启脚本
# 双击此文件即可重启 Lore 服务

cd "$(dirname "$0")"

osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)'; ./manager.sh restart; echo ''; echo '按回车键关闭此窗口...'; read"
    activate
end tell
EOF

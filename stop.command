#!/bin/bash

# Lore 停止脚本
# 双击此文件即可停止 Lore 服务

cd "$(dirname "$0")"

# 在终端中运行 manager.sh stop
osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)'; ./manager.sh stop; echo ''; echo '服务已停止，按回车键关闭此窗口...'; read"
    activate
end tell
EOF

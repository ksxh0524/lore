#!/bin/bash

# Lore 启动脚本
# 双击此文件即可启动 Lore 服务

cd "$(dirname "$0")"

# 打开终端窗口并运行 manager.sh start
osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)'; ./manager.sh start; echo ''; echo '按回车键关闭此窗口...'; read"
    activate
end tell
EOF

#!/bin/bash

# Lore 重启脚本
# 双击此文件即可重启 Lore 服务

set -e

# 切换到脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 加载环境变量
load_env() {
    local default_server_port=39527
    local default_client_port=39528
    
    if [ -f ".env" ]; then
        local env_server_port=$(grep "^LORE_SERVER_PORT=" .env | cut -d'=' -f2 | tr -d ' ')
        [ -n "$env_server_port" ] && SERVER_PORT="$env_server_port"
        
        local env_client_port=$(grep "^LORE_CLIENT_PORT=" .env | cut -d'=' -f2 | tr -d ' ')
        [ -n "$env_client_port" ] && CLIENT_PORT="$env_client_port"
    fi
    
    SERVER_PORT="${LORE_SERVER_PORT:-${SERVER_PORT:-$default_server_port}}"
    CLIENT_PORT="${LORE_CLIENT_PORT:-${CLIENT_PORT:-$default_client_port}}"
}

load_env

# 验证端口
if ! [[ "$SERVER_PORT" =~ ^[0-9]+$ ]] || [ "$SERVER_PORT" -lt 10000 ] || [ "$SERVER_PORT" -gt 65535 ]; then
    SERVER_PORT=39527
fi

if ! [[ "$CLIENT_PORT" =~ ^[0-9]+$ ]] || [ "$CLIENT_PORT" -lt 10000 ] || [ "$CLIENT_PORT" -gt 65535 ]; then
    CLIENT_PORT=39528
fi

osascript <<EOF
tell application "Terminal"
    set scriptContent to "cd '$SCRIPT_DIR' && " & ¬
        "echo '╔══════════════════════════════════════════╗' && " & ¬
        "echo '║       Lore 服务重启中...                ║' && " & ¬
        "echo '╚══════════════════════════════════════════╝' && " & ¬
        "echo '' && " & ¬
        "echo '配置信息:' && " & ¬
        "echo '  后端端口: $SERVER_PORT' && " & ¬
        "echo '  前端端口: $CLIENT_PORT' && " & ¬
        "echo '' && " & ¬
        "./manager.sh restart && " & ¬
        "echo '' && " & ¬
        "echo '访问地址:' && " & ¬
        "echo '  后端 API: http://localhost:$SERVER_PORT' && " & ¬
        "echo '  前端页面: http://localhost:$CLIENT_PORT'"
    
    do script scriptContent
    activate
end tell
EOF

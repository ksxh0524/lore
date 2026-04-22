#!/bin/bash

# Lore 停止脚本
# 双击此文件即可停止 Lore 服务

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 加载端口配置（优先环境变量，其次 .env 文件）
load_ports() {
    local default_server_port=39527
    local default_client_port=39528

    # 从 .env 文件读取
    if [ -f "$SCRIPT_DIR/.env" ]; then
        local env_server_port=$(grep "^LORE_SERVER_PORT=" "$SCRIPT_DIR/.env" | cut -d'=' -f2 | tr -d ' ')
        local env_client_port=$(grep "^LORE_CLIENT_PORT=" "$SCRIPT_DIR/.env" | cut -d'=' -f2 | tr -d ' ')
        [ -n "$env_server_port" ] && SERVER_PORT="$env_server_port"
        [ -n "$env_client_port" ] && CLIENT_PORT="$env_client_port"
    fi

    # 环境变量优先级更高
    SERVER_PORT="${LORE_SERVER_PORT:-${SERVER_PORT:-$default_server_port}}"
    CLIENT_PORT="${LORE_CLIENT_PORT:-${CLIENT_PORT:-$default_client_port}}"
}

load_ports

echo '╔══════════════════════════════════════════╗'
echo '║       Lore 服务停止中...                ║'
echo '╚══════════════════════════════════════════╝'
echo ''
echo '配置信息:'
echo "  后端端口: $SERVER_PORT"
echo "  前端端口: $CLIENT_PORT"
echo ''

./manager.sh stop

echo ''
echo '服务已停止'
echo ''
echo '窗口将在 2 秒后自动关闭...'
sleep 2

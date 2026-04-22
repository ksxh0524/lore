#!/bin/bash

# Lore 管理脚本
# 版本: 2.0.0
# 用法: ./manager.sh [start|stop|status|restart|logs|update|clean|test|build|config]

set -euo pipefail

# ============================================================================
# 全局配置
# ============================================================================

readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly LOG_DIR="$SCRIPT_DIR/logs"
readonly PID_DIR="$SCRIPT_DIR/.pids"

# 默认端口配置 (10000+)
readonly DEFAULT_SERVER_PORT=39527
readonly DEFAULT_CLIENT_PORT=39528

# 超时配置
readonly MAX_START_WAIT=30
readonly MAX_STOP_WAIT=8
readonly LOG_RETENTION_DAYS=7

# 颜色定义
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ============================================================================
# 配置加载
# ============================================================================

# 加载 .env 文件
load_env() {
    local env_file=""
    
    # 查找 .env 文件
    if [ -f "$SCRIPT_DIR/.env" ]; then
        env_file="$SCRIPT_DIR/.env"
    elif [ -f "$SCRIPT_DIR/../.env" ]; then
        env_file="$SCRIPT_DIR/../.env"
    elif [ -f "$HOME/.lore/.env" ]; then
        env_file="$HOME/.lore/.env"
    fi
    
    # 加载环境变量
    if [ -n "$env_file" ] && [ -f "$$env_file" ]; then
        set -a
        source "$env_file" 2>/dev/null || true
        set +a
    fi
}

# 获取服务器端口
get_server_port() {
    local port="${LORE_SERVER_PORT:-$DEFAULT_SERVER_PORT}"
    # 确保端口在有效范围内
    if [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 10000 ] && [ "$port" -le 65535 ]; then
        echo "$port"
    else
        echo "$DEFAULT_SERVER_PORT"
    fi
}

# 获取客户端端口
get_client_port() {
    local port="${LORE_CLIENT_PORT:-$DEFAULT_CLIENT_PORT}"
    # 确保端口在有效范围内
    if [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 10000 ] && [ "$port" -le 65535 ]; then
        echo "$port"
    else
        echo "$DEFAULT_CLIENT_PORT"
    fi
}

# ============================================================================
# 初始化
# ============================================================================

init() {
    load_env
    mkdir -p "$LOG_DIR" "$PID_DIR"
    mkdir -p "${LORE_DATA_DIR:-$HOME/.lore}"
}

# ============================================================================
# 工具函数
# ============================================================================

log_info()    { echo -e "${BLUE}  $1${NC}"; }
log_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
log_warning() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
log_error()   { echo -e "${RED}  ✗ $1${NC}"; }

# 获取服务配置
get_service_info() {
    local service_name="$1"
    local field="$2"
    local server_port=$(get_server_port)
    local client_port=$(get_client_port)
    
    case "$service_name" in
        server)
            case "$field" in
                port) echo "$server_port" ;;
                name) echo "Server (Fastify)" ;;
                dir) echo "packages/server" ;;
                cmd) echo "pnpm run dev" ;;
                health) echo "/api/config" ;;
            esac
            ;;
        client)
            case "$field" in
                port) echo "$client_port" ;;
                name) echo "Client (Vite)" ;;
                dir) echo "packages/client" ;;
                cmd) echo "pnpm run dev" ;;
                health) echo "/" ;;
            esac
            ;;
    esac
}

# 根据端口获取 PID
get_pids_by_port() {
    local port="$1"
    lsof -ti:$port 2>/dev/null || echo ""
}

# 检查服务是否运行
is_service_running() {
    local service_name="$1"
    local port=$(get_service_info "$service_name" port)
    local pids=$(get_pids_by_port "$port")
    [ -n "$pids" ]
}

# 等待服务健康检查
wait_for_health() {
    local service_name="$1"
    local port=$(get_service_info "$service_name" port)
    local health_path=$(get_service_info "$service_name" health)
    local max_wait="${2:-$MAX_START_WAIT}"
    local waited=0
    
    while [ $waited -lt $max_wait ]; do
        if curl -sf "http://localhost:$port$health_path" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        ((waited++))
    done
    return 1
}

# 检查 API Key 配置
check_api_keys() {
    local has_key=false
    local key_count=0
    
    [ -n "${DASHSCOPE_API_KEY:-}" ] && ((key_count++))
    [ -n "${OPENAI_API_KEY:-}" ] && ((key_count++))
    [ -n "${GEMINI_API_KEY:-}" ] && ((key_count++))
    [ -n "${ANTHROPIC_API_KEY:-}" ] && ((key_count++))
    
    if [ $key_count -eq 0 ]; then
        log_warning "未检测到 API Key，将使用 Mock Provider"
        log_info "请复制 .env.example 为 .env 并配置你的 API Keys"
        return 1
    else
        log_success "检测到 $key_count 个 API Key"
        return 0
    fi
}

# ============================================================================
# 服务管理
# ============================================================================

start_service() {
    local service_name="$1"
    local port=$(get_service_info "$service_name" port)
    local name=$(get_service_info "$service_name" name)
    local dir=$(get_service_info "$service_name" dir)
    local cmd=$(get_service_info "$service_name" cmd)
    
    log_info "启动 $name (端口 $port)..."
    
    # 检查是否已在运行
    if is_service_running "$service_name"; then
        log_warning "$name 已在运行 (端口 $port)"
        return 0
    fi
    
    # 检查端口占用
    local existing_pids=$(get_pids_by_port "$port")
    if [ -n "$existing_pids" ]; then
        log_warning "端口 $port 被占用，尝试释放..."
        kill -9 $existing_pids 2>/dev/null || true
        sleep 1
    fi
    
    # 启动服务
    local log_file="$LOG_DIR/$service_name.log"
    (
        cd "$SCRIPT_DIR/$dir"
        export LORE_SERVER_PORT=$(get_server_port)
        export LORE_CLIENT_PORT=$(get_client_port)
        $cmd > "$log_file" 2>&1 &
    )
    
    # 等待服务启动
    if wait_for_health "$service_name"; then
        log_success "$name 启动成功 (端口 $port)"
        return 0
    else
        log_error "$name 启动失败，查看日志: $log_file"
        return 1
    fi
}

stop_service() {
    local service_name="$1"
    local port=$(get_service_info "$service_name" port)
    local name=$(get_service_info "$service_name" name)
    
    log_info "停止 $name..."
    
    local pids=$(get_pids_by_port "$port")
    if [ -z "$pids" ]; then
        log_info "$name 未运行"
        return 0
    fi
    
    # 先尝试优雅停止
    echo "$pids" | xargs kill 2>/dev/null || true
    
    # 等待停止
    local waited=0
    while [ $waited -lt $MAX_STOP_WAIT ]; do
        pids=$(get_pids_by_port "$port")
        [ -z "$pids" ] && break
        sleep 1
        ((waited++))
    done
    
    # 强制停止
    pids=$(get_pids_by_port "$port")
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
    
    log_success "$name 已停止"
}

# ============================================================================
# 主命令
# ============================================================================

cmd_start() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 启动中... (v$SCRIPT_VERSION)            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo
    
    check_api_keys
    echo
    
    log_info "启动服务:"
    echo
    
    local failed=0
    
    start_service "server" || ((failed++))
    start_service "client" || ((failed++))
    
    echo
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║       所有服务已启动                     ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
        echo
        log_info "后端服务: http://localhost:$(get_server_port)"
        log_success "前端页面: http://localhost:$(get_client_port)"
        log_info "数据目录: ${LORE_DATA_DIR:-$HOME/.lore}"
        echo
        log_info "查看日志: ./manager.sh logs"
        log_info "停止服务: ./manager.sh stop"
    else
        echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
        echo -e "${RED}║       部分服务启动失败                   ║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
        echo
        log_info "查看日志: ./manager.sh logs"
        return 1
    fi
}

cmd_stop() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 停止中...                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo
    
    log_info "停止服务:"
    echo
    
    stop_service "client"
    stop_service "server"
    
    echo
    log_success "所有服务已停止"
}

cmd_restart() {
    cmd_stop
    echo
    sleep 2
    cmd_start
}

cmd_status() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 服务状态 (v$SCRIPT_VERSION)            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo
    
    local data_dir="${LORE_DATA_DIR:-$HOME/.lore}"
    
    # SQLite 状态
    if [ -f "$data_dir/lore.db" ]; then
        local db_size=$(du -h "$data_dir/lore.db" 2>/dev/null | cut -f1)
        log_success "SQLite 已就绪 ($db_size)"
    else
        log_info "SQLite 待初始化"
    fi
    
    # API Key 状态
    local key_count=0
    [ -n "${DASHSCOPE_API_KEY:-}" ] && ((key_count++))
    [ -n "${OPENAI_API_KEY:-}" ] && ((key_count++))
    [ -n "${GEMINI_API_KEY:-}" ] && ((key_count++))
    [ -n "${ANTHROPIC_API_KEY:-}" ] && ((key_count++))
    
    if [ $key_count -gt 0 ]; then
        log_success "LLM 配置 $key_count 个 Provider"
    else
        log_warning "LLM 配置 使用 Mock Provider"
    fi
    
    echo
    
    # 服务状态
    for service in server client; do
        local name=$(get_service_info "$service" name)
        local port=$(get_service_info "$service" port)
        
        if is_service_running "$service"; then
            log_success "● $name 运行中 (端口 $port)"
        else
            log_error "○ $name 未运行 (端口 $port)"
        fi
    done
}

cmd_logs() {
    local service="${1:-}"
    local lines="${2:-100}"
    
    if [ -z "$service" ]; then
        log_info "可用日志:"
        for svc in server client; do
            local log_file="$LOG_DIR/$svc.log"
            if [ -f "$log_file" ]; then
                local size=$(du -h "$log_file" 2>/dev/null | cut -f1)
                echo "  - $svc ($size): $log_file"
            fi
        done
        echo
        log_info "用法: ./manager.sh logs <server|client> [行数]"
        return
    fi
    
    local log_file="$LOG_DIR/$service.log"
    if [ -f "$log_file" ]; then
        tail -n "$lines" -f "$log_file"
    else
        log_error "日志文件不存在: $log_file"
    fi
}

cmd_config() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 配置                          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo
    
    load_env
    
    log_info "服务配置:"
    echo "  Server 端口: $(get_server_port)"
    echo "  Client 端口: $(get_client_port)"
    echo "  数据目录: ${LORE_DATA_DIR:-$HOME/.lore}"
    echo
    
    log_info "API Keys:"
    [ -n "${DASHSCOPE_API_KEY:-}" ] && echo "  ✓ DashScope" || echo "  ✗ DashScope"
    [ -n "${OPENAI_API_KEY:-}" ] && echo "  ✓ OpenAI" || echo "  ✗ OpenAI"
    [ -n "${GEMINI_API_KEY:-}" ] && echo "  ✓ Gemini" || echo "  ✗ Gemini"
    [ -n "${ANTHROPIC_API_KEY:-}" ] && echo "  ✓ Claude" || echo "  ✗ Claude"
    echo
    
    log_info "配置文件位置:"
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo "  ✓ $SCRIPT_DIR/.env"
    elif [ -f "$HOME/.lore/.env" ]; then
        echo "  ✓ $HOME/.lore/.env"
    else
        echo "  ✗ 未找到 .env 文件"
        echo "    请复制 .env.example 为 .env 并配置"
    fi
}

cmd_build() {
    log_info "构建所有包..."
    cd "$SCRIPT_DIR"
    pnpm run build
    log_success "构建完成"
}

cmd_test() {
    local target="${1:-all}"
    log_info "运行测试: $target"
    cd "$SCRIPT_DIR"
    
    case "$target" in
        server)
            pnpm --filter @lore/server test
            ;;
        all|*)
            pnpm test
            ;;
    esac
}

cmd_clean() {
    log_info "清理旧日志..."
    find "$LOG_DIR" -name "*.log" -mtime +$LOG_RETENTION_DAYS -delete 2>/dev/null || true
    log_success "清理完成"
}

cmd_help() {
    echo "Lore 管理脚本 v$SCRIPT_VERSION"
    echo
    echo "用法: ./manager.sh <command> [options]"
    echo
    echo "命令:"
    echo "  start       启动所有服务 (后台运行)"
    echo "  stop        停止所有服务"
    echo "  restart     重启所有服务"
    echo "  status      查看服务状态"
    echo "  logs        查看日志 (可选: logs <server|client> [行数])"
    echo "  config      显示当前配置"
    echo "  build       构建所有包"
    echo "  test        运行测试 (可选: test <all|server>)"
    echo "  clean       清理旧日志"
    echo ""
    echo "配置:"
    echo "  复制 .env.example 为 .env 并修改配置"
    echo "  或设置环境变量 LORE_SERVER_PORT 和 LORE_CLIENT_PORT"
    echo ""
    echo "示例:"
    echo "  ./manager.sh start              # 启动服务"
    echo "  ./manager.sh config             # 查看配置"
    echo "  ./manager.sh logs server        # 查看后端日志"
}

# ============================================================================
# 主程序
# ============================================================================

main() {
    init
    
    local cmd="${1:-help}"
    shift || true
    
    case "$cmd" in
        start)      cmd_start "$@" ;;
        stop)       cmd_stop "$@" ;;
        restart)    cmd_restart "$@" ;;
        status)     cmd_status "$@" ;;
        logs)       cmd_logs "$@" ;;
        config)     cmd_config "$@" ;;
        build)      cmd_build "$@" ;;
        test)       cmd_test "$@" ;;
        clean)      cmd_clean "$@" ;;
        help|--help|-h) cmd_help "$@" ;;
        *)
            log_error "未知命令: $cmd"
            echo
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"

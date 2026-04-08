#!/bin/bash

# Lore 管理脚本
# 版本: 1.0.0
# 用法: ./manager.sh [start|stop|status|restart|logs|update|clean|test|build]

set -euo pipefail

# ============================================================================
# 全局配置
# ============================================================================

readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly LOG_DIR="$SCRIPT_DIR/logs"
readonly PID_DIR="$SCRIPT_DIR/.pids"
readonly DATA_DIR="$HOME/.lore"

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

# 服务配置: name|port|display_name|workdir|start_cmd|health_path
readonly SERVICES=(
    "server|3952|Server (Fastify)|packages/server|pnpm run dev|/api/config"
    "client|5173|Client (Vite)|packages/client|pnpm run dev|/"
)

# ============================================================================
# 初始化
# ============================================================================

init() {
    mkdir -p "$LOG_DIR" "$PID_DIR" "$DATA_DIR"
}

# ============================================================================
# 工具函数
# ============================================================================

log_info()    { echo -e "${BLUE}  $1${NC}"; }
log_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
log_warning() { echo -e "${YELLOW}  $1${NC}"; }
log_error()   { echo -e "${RED}  ✗ $1${NC}"; }

get_service_field() {
    local service=$1
    local field=$2
    local idx
    case "$field" in
        name)    idx=0 ;;
        port)    idx=1 ;;
        display) idx=2 ;;
        workdir) idx=3 ;;
        cmd)     idx=4 ;;
        health)  idx=5 ;;
        *)       return 1 ;;
    esac
    for svc in "${SERVICES[@]}"; do
        if [[ "$svc" == "$service|"* ]]; then
            echo "$svc" | cut -d'|' -f$((idx + 1))
            return 0
        fi
    done
    return 1
}

has_command() {
    command -v "$1" &> /dev/null
}

get_pids_by_port() {
    local port=$1
    if has_command lsof; then
        lsof -ti :"$port" 2>/dev/null || true
    fi
}

# ============================================================================
# 服务状态检查
# ============================================================================

is_service_running() {
    local service=$1
    local port
    port=$(get_service_field "$service" port) || return 1
    local pid_file="$PID_DIR/${service}.pid"

    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        rm -f "$pid_file"
    fi

    if curl -s -o /dev/null -m 2 "http://localhost:$port" 2>/dev/null; then
        return 0
    fi

    return 1
}

# ============================================================================
# 健康检查
# ============================================================================

wait_for_health() {
    local service=$1
    local port health_path
    port=$(get_service_field "$service" port) || return 1
    health_path=$(get_service_field "$service" health) || health_path="/"

    local count=0
    while [ $count -lt $MAX_START_WAIT ]; do
        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" -m 2 "http://localhost:${port}${health_path}" 2>/dev/null || echo "000")

        if [ "$response" = "200" ]; then
            return 0
        fi

        # Vite dev server returns 200 or 304 for HTML pages
        if [ "$service" = "client" ] && { [ "$response" = "200" ] || [ "$response" = "304" ]; }; then
            return 0
        fi

        sleep 1
        count=$((count + 1))
    done
    return 1
}

# ============================================================================
# 配置检查
# ============================================================================

check_config() {
    local config_file="$DATA_DIR/config.json"

    if [ ! -f "$config_file" ]; then
        log_warning "配置文件不存在: $config_file"
        log_info "创建默认配置..."

        cat > "$config_file" << 'EOF'
{
  "llm": {
    "providers": [],
    "defaults": {
      "premiumModel": "gpt-4o",
      "standardModel": "gpt-4o-mini",
      "cheapModel": "gpt-3.5-turbo"
    },
    "limits": {
      "maxConcurrent": 5,
      "dailyBudget": null,
      "timeoutMs": 30000
    }
  },
  "world": {
    "defaultTickIntervalMs": 3000,
    "defaultTimeSpeed": 60
  },
  "server": {
    "port": 3952,
    "host": "0.0.0.0"
  }
}
EOF
        log_success "默认配置已创建: $config_file"
        log_warning "如需使用真实 LLM，请编辑配置文件添加 provider"
    fi

    # 检查环境变量
    if [ -z "${OPENAI_API_KEY:-}" ]; then
        log_warning "未设置 OPENAI_API_KEY 环境变量，将使用 Mock Provider"
    fi
}

# ============================================================================
# 服务管理
# ============================================================================

start_service() {
    local service=$1
    local port name workdir cmd
    port=$(get_service_field "$service" port) || return 1
    name=$(get_service_field "$service" display) || return 1
    workdir=$(get_service_field "$service" workdir) || return 1
    cmd=$(get_service_field "$service" cmd) || return 1

    local pid_file="$PID_DIR/${service}.pid"
    local log_file="$LOG_DIR/${service}.log"

    if is_service_running "$service"; then
        log_warning "$name 已在运行 (端口 $port)"
        return 0
    fi

    log_info "启动 $name..."

    cd "$SCRIPT_DIR/$workdir"
    nohup $cmd > "$log_file" 2>&1 &
    echo $! > "$pid_file"
    cd "$SCRIPT_DIR"

    if wait_for_health "$service"; then
        log_success "$name 启动成功 (端口 $port)"
        return 0
    else
        log_error "$name 启动失败"
        log_warning "查看日志: tail -f $log_file"
        return 1
    fi
}

stop_service() {
    local service=$1
    local port name
    port=$(get_service_field "$service" port) || return 1
    name=$(get_service_field "$service" display) || return 1
    local pid_file="$PID_DIR/${service}.pid"

    if ! is_service_running "$service"; then
        log_info "$name 未运行"
        rm -f "$pid_file" 2>/dev/null || true
        return 0
    fi

    log_warning "停止 $name..."

    local all_pids=""

    if [ -f "$pid_file" ]; then
        local file_pid
        file_pid=$(cat "$pid_file")
        if kill -0 "$file_pid" 2>/dev/null; then
            all_pids="$file_pid"
            local children
            children=$(pgrep -P "$file_pid" 2>/dev/null || true)
            [ -n "$children" ] && all_pids="$all_pids $children"
        fi
    fi

    local port_pids
    port_pids=$(get_pids_by_port "$port")
    [ -n "$port_pids" ] && all_pids="$all_pids $port_pids"

    all_pids=$(echo "$all_pids" | tr ' ' '\n' | sort -u | grep -v '^$' || true)

    if [ -z "$all_pids" ]; then
        log_success "$name 已停止"
        rm -f "$pid_file" 2>/dev/null || true
        return 0
    fi

    echo "$all_pids" | xargs kill -TERM 2>/dev/null || true

    local count=0
    while [ $count -lt $MAX_STOP_WAIT ]; do
        local still_alive=false
        for pid in $all_pids; do
            if kill -0 "$pid" 2>/dev/null; then
                still_alive=true
                break
            fi
        done
        if [ "$still_alive" = false ]; then
            log_success "$name 已停止"
            rm -f "$pid_file" 2>/dev/null || true
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    log_warning "强制停止 $name..."
    echo "$all_pids" | xargs kill -9 2>/dev/null || true

    local leftover
    leftover=$(get_pids_by_port "$port")
    [ -n "$leftover" ] && echo "$leftover" | xargs kill -9 2>/dev/null || true

    rm -f "$pid_file" 2>/dev/null || true
    log_success "$name 已强制停止"
    return 0
}

# ============================================================================
# 主命令
# ============================================================================

start_services() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 启动中... (v$SCRIPT_VERSION)            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    # 检查依赖
    if ! has_command pnpm; then
        log_error "未找到 pnpm，请先安装: npm install -g pnpm"
        exit 1
    fi

    if ! has_command node; then
        log_error "未找到 Node.js，请先安装"
        exit 1
    fi

    # 安装依赖
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        log_warning "安装依赖..."
        pnpm install
    fi

    # 配置检查
    check_config

    echo -e "${CYAN}启动服务:${NC}"
    echo ""

    # 先启动 server（client 依赖 server 的 proxy）
    start_service "server" || exit 1
    start_service "client" || exit 1

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       所有服务已启动                     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BLUE}Server:${NC}     http://localhost:3952"
    echo -e "  ${GREEN}Client:${NC}     http://localhost:5173"
    echo -e "  ${YELLOW}数据目录:${NC}   $DATA_DIR"
    echo ""
    echo -e "${CYAN}查看日志: ./manager.sh logs${NC}"
    echo -e "${CYAN}停止服务: ./manager.sh stop${NC}"
    echo ""
}

stop_services() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 停止中...                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${CYAN}停止服务:${NC}"
    echo ""

    for ((i=${#SERVICES[@]}-1; i>=0; i--)); do
        local name
        name=$(echo "${SERVICES[$i]}" | cut -d'|' -f1)
        stop_service "$name"
    done

    echo ""
    echo -e "${GREEN}所有服务已停止${NC}"
}

show_status() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 服务状态 (v$SCRIPT_VERSION)            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    # 数据目录
    if [ -d "$DATA_DIR" ]; then
        local db_file="$DATA_DIR/lore.db"
        if [ -f "$db_file" ]; then
            local db_size
            db_size=$(du -h "$db_file" | cut -f1)
            echo -e "  ${GREEN}●${NC} SQLite ${GREEN}已就绪${NC} ($db_size)"
        else
            echo -e "  ${YELLOW}●${NC} SQLite ${YELLOW}未初始化${NC} (首次启动时自动创建)"
        fi
    else
        echo -e "  ${YELLOW}●${NC} 数据目录 ${YELLOW}不存在${NC}"
    fi

    # 配置文件
    local config_file="$DATA_DIR/config.json"
    if [ -f "$config_file" ]; then
        local provider_count
        provider_count=$(grep -c '"apiKey"' "$config_file" 2>/dev/null || echo "0")
        if [ "$provider_count" -gt 0 ]; then
            echo -e "  ${GREEN}●${NC} LLM 配置 ${GREEN}已就绪${NC} ($provider_count 个 provider)"
        else
            echo -e "  ${YELLOW}●${NC} LLM 配置 ${YELLOW}使用 Mock Provider${NC}"
        fi
    else
        echo -e "  ${YELLOW}●${NC} 配置文件 ${YELLOW}不存在${NC} (首次启动时自动创建)"
    fi

    echo ""

    # 应用服务
    for svc in "${SERVICES[@]}"; do
        local name port display pid_file
        name=$(echo "$svc" | cut -d'|' -f1)
        port=$(echo "$svc" | cut -d'|' -f2)
        display=$(echo "$svc" | cut -d'|' -f3)
        pid_file="$PID_DIR/${name}.pid"

        if is_service_running "$name"; then
            local pid=""
            [ -f "$pid_file" ] && pid=$(cat "$pid_file")
            [ -z "$pid" ] && pid=$(get_pids_by_port "$port" | head -1)

            local uptime=""
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                local start_time start_epoch
                start_time=$(ps -p "$pid" -o lstart= 2>/dev/null || echo "")
                if [ -n "$start_time" ]; then
                    if [[ "$OSTYPE" == "darwin"* ]]; then
                        start_epoch=$(date -j -f "%a %b %d %T %Y" "$start_time" "+%s" 2>/dev/null || echo "")
                    else
                        start_epoch=$(date -d "$start_time" "+%s" 2>/dev/null || echo "")
                    fi
                    if [ -n "$start_epoch" ]; then
                        local now_epoch diff days hours mins
                        now_epoch=$(date "+%s")
                        diff=$((now_epoch - start_epoch))
                        days=$((diff / 86400))
                        hours=$(( (diff % 86400) / 3600 ))
                        mins=$(( (diff % 3600) / 60 ))
                        if [ $days -gt 0 ]; then
                            uptime="${days}天${hours}小时"
                        elif [ $hours -gt 0 ]; then
                            uptime="${hours}小时${mins}分"
                        else
                            uptime="${mins}分钟"
                        fi
                    fi
                fi
            fi
            echo -e "  ${GREEN}●${NC} $display ${GREEN}运行中${NC}"
            [ -n "$uptime" ] && echo -e "    ${CYAN}http://localhost:$port${NC}  |  PID: ${CYAN}${pid}${NC}  |  运行时长: ${CYAN}${uptime}${NC}"
        else
            echo -e "  ${RED}○${NC} $display ${RED}未运行${NC}"
        fi
    done
    echo ""
}

show_logs() {
    local service="${1:-}"

    if [ -z "$service" ]; then
        local log_files=()
        for svc in "${SERVICES[@]}"; do
            local name log_file
            name=$(echo "$svc" | cut -d'|' -f1)
            log_file="$LOG_DIR/${name}.log"
            [ -f "$log_file" ] && log_files+=("$log_file")
        done

        if [ ${#log_files[@]} -eq 0 ]; then
            log_warning "没有日志文件，请先启动服务"
            return
        fi

        echo -e "${CYAN}实时查看所有服务日志 (Ctrl+C 退出):${NC}"
        tail -f "${log_files[@]}"
        return
    fi

    local log_file="$LOG_DIR/${service}.log"
    if [ ! -f "$log_file" ]; then
        log_error "日志文件不存在: $log_file"
        log_info "可用服务: server, client"
        exit 1
    fi

    local lines="${2:-50}"
    echo -e "${CYAN}查看 $service 最近 $lines 行日志 (Ctrl+C 退出):${NC}"
    tail -n "$lines" -f "$log_file"
}

do_update() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 更新中...                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    log_info "拉取最新代码..."
    if git pull; then
        log_success "git pull 成功"
    else
        log_error "git pull 失败"
        exit 1
    fi

    log_info "安装依赖..."
    pnpm install
    log_success "依赖安装完成"

    echo ""
    log_success "更新完成！"

    for svc in "${SERVICES[@]}"; do
        local name
        name=$(echo "$svc" | cut -d'|' -f1)
        if is_service_running "$name"; then
            log_warning "检测到有服务正在运行，建议重启以应用更新"
            echo -e "运行 ${CYAN}./manager.sh restart${NC} 重启所有服务"
            break
        fi
    done
}

do_build() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 构建中...                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    if ! has_command pnpm; then
        log_error "未找到 pnpm"
        exit 1
    fi

    log_info "构建所有包..."
    pnpm run build
    log_success "构建完成"
}

do_test() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 测试中...                     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    local target="${1:-all}"

    case "$target" in
        server)
            log_info "运行 Server 测试..."
            cd "$SCRIPT_DIR/packages/server"
            pnpm run test || true
            cd "$SCRIPT_DIR"
            ;;
        all)
            log_info "运行所有测试..."
            cd "$SCRIPT_DIR/packages/server"
            pnpm run test 2>/dev/null || true
            cd "$SCRIPT_DIR"
            log_success "测试完成"
            ;;
        *)
            log_error "未知测试目标: $target"
            log_info "可用: all, server"
            exit 1
            ;;
    esac
}

do_typecheck() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 类型检查中...                 ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    local has_error=false

    log_info "检查 shared..."
    cd "$SCRIPT_DIR/packages/shared"
    pnpm run typecheck 2>&1 || has_error=true

    log_info "检查 server..."
    cd "$SCRIPT_DIR/packages/server"
    pnpm run typecheck 2>&1 || has_error=true

    log_info "检查 client..."
    cd "$SCRIPT_DIR/packages/client"
    pnpm run typecheck 2>&1 || has_error=true

    cd "$SCRIPT_DIR"

    if [ "$has_error" = true ]; then
        echo ""
        log_error "类型检查发现错误"
        exit 1
    else
        echo ""
        log_success "类型检查全部通过"
    fi
}

do_clean() {
    log_info "清理 $LOG_RETENTION_DAYS 天前的旧日志..."

    if [ ! -d "$LOG_DIR" ] || [ -z "$(ls -A "$LOG_DIR" 2>/dev/null)" ]; then
        log_warning "日志目录为空"
        return
    fi

    local count
    count=$(find "$LOG_DIR" -name "*.log" -type f -mtime +$LOG_RETENTION_DAYS 2>/dev/null | wc -l | tr -d ' ')

    if [ "$count" -eq 0 ]; then
        log_success "没有需要清理的旧日志"
        return
    fi

    find "$LOG_DIR" -name "*.log" -type f -mtime +$LOG_RETENTION_DAYS -exec rm -v {} \;
    log_success "已清理 $count 个旧日志文件"
}

do_dev() {
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Lore 开发模式 (前台运行)           ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
    echo ""

    check_config

    log_info "启动 dev 模式 (Ctrl+C 退出)..."
    echo ""
    pnpm run dev
}

show_help() {
    cat << EOF
Lore 管理脚本 v$SCRIPT_VERSION

用法: $0 <command> [options]

命令:
  start       启动所有服务 (后台运行)
  stop        停止所有服务
  restart     重启所有服务
  status      查看服务状态
  dev         开发模式 (前台运行 server + client)
  logs        查看日志 (可选: logs <server|client> [行数])
  build       构建所有包
  test        运行测试 (可选: test <all|server>)
  typecheck   类型检查所有包
  update      拉取代码并安装依赖
  clean       清理 $LOG_RETENTION_DAYS 天前的旧日志

示例:
  $0 start              # 启动所有服务
  $0 dev                # 前台开发模式
  $0 logs server        # 查看 server 日志
  $0 logs client 100    # 查看 client 最近 100 行日志
  $0 test server        # 运行 server 测试
  $0 typecheck          # 类型检查
  $0 update             # 更新代码+依赖

数据目录: $DATA_DIR
配置文件: $DATA_DIR/config.json
EOF
}

# ============================================================================
# 主入口
# ============================================================================

init

case "${1:-}" in
    start)     start_services ;;
    stop)      stop_services ;;
    restart)
        stop_services
        echo ""
        sleep 2
        start_services
        ;;
    status)    show_status ;;
    dev)       do_dev ;;
    logs)
        shift || true
        show_logs "$@"
        ;;
    build)     do_build ;;
    test)
        shift || true
        do_test "$@"
        ;;
    typecheck) do_typecheck ;;
    update)    do_update ;;
    clean)     do_clean ;;
    -h|--help|help) show_help ;;
    *)
        show_help
        exit 1
        ;;
esac

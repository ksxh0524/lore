# 前端开发规范

> 最后更新：2026-04-08 | 版本 v0.02

---

## 技术选型

| 层面 | 选型 | 版本 |
|------|------|------|
| 框架 | React | 19 |
| 语言 | TypeScript | 5.x strict |
| 构建 | Vite | 6.x |
| UI 组件 | shadcn/ui | 最新 |
| 样式 | Tailwind CSS | 4.x |
| 状态管理 | zustand | 5.x |
| 动画 | framer-motion | 11.x |
| 路由 | React Router | 7.x |
| 图标 | Lucide React | 最新 |
| 请求 | 原生 fetch + WebSocket | - |
| 测试 | vitest + @testing-library/react | - |

## 项目结构

```
packages/client/src/
+-- main.tsx                    # 入口，挂载 App
+-- app.tsx                     # 路由定义、全局 Provider
+-- components/
|   +-- layout/                 # 布局组件
|   +-- init/                   # 初始化页面组件
|   +-- world/                  # 世界视图组件
|   +-- chat/                   # 聊天组件
|   +-- agent/                  # Agent 详情组件
|   +-- platform/               # 虚拟平台组件
|   +-- social/                 # 社交组件
|   +-- god/                    # 上帝模式组件
|   +-- monitor/                # 监控面板组件
|   +-- preset/                 # 预设组件
|   +-- settings/               # 设置组件
|   +-- ui/                     # shadcn/ui 基础组件（自动生成）
+-- pages/
|   +-- InitPage.tsx
|   +-- WorldPage.tsx
|   +-- SettingsPage.tsx
+-- hooks/
|   +-- useWebSocket.ts
|   +-- useAgent.ts
|   +-- useEventStream.ts
+-- stores/
|   +-- worldStore.ts
|   +-- agentStore.ts
|   +-- chatStore.ts
|   +-- platformStore.ts
+-- services/
|   +-- ws.ts                   # WebSocket 连接管理
|   +-- api.ts                  # REST API 封装
+-- lib/
|   +-- utils.ts                # cn() 等工具函数
|   +-- constants.ts            # 常量
|   +-- types.ts                # 前端专用类型
+-- styles/
    +-- globals.css             # Tailwind 入口 + CSS 变量
```

## TypeScript 规范

### strict 模式

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 类型定义

- **共享类型**放 `packages/shared/src/`，前后端共用
- **前端专用类型**放 `packages/client/src/lib/types.ts`
- **组件 Props** 就近定义，用 `interface` 不用 `type`

```typescript
// ✅ Good
interface EventCardProps {
  event: WorldEvent;
  onChoiceSelect: (choice: string) => void;
}

// ❌ Bad
type EventCardProps = {
  event: WorldEvent;
}
```

### 禁止 any

```typescript
// ❌ Bad
const data: any = response.data;

// ✅ Good
const data: WorldEvent = response.data;
```

除非性能与第三方库交互且确实无法确定类型，可以用 `unknown` 然后做类型守卫。

## 组件规范

### 文件命名

- 组件文件：PascalCase（`EventCard.tsx`）
- Hook 文件：camelCase（`useWebSocket.ts`）
- Store 文件：camelCase（`worldStore.ts`）
- 工具文件：camelCase（`utils.ts`）

### 组件模板

```tsx
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  agentId: string;
  className?: string;
}

export function ChatPanel({ agentId, className }: ChatPanelProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* ... */}
    </div>
  );
}
```

### 组件拆分原则

- **单文件不超过 200 行**。超过就拆子组件
- **一个文件一个组件**。小型辅助组件可以放同目录的 `helpers.tsx`
- **组件只做展示**。逻辑放 hook 或 store
- **Props 向下传递，事件向上冒泡**

```tsx
// ✅ Good: 展示组件
function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <div onClick={() => onClick(agent.id)}>
      <span>{agent.profile.name}</span>
      <span>{moodEmoji(agent.stats.mood)}</span>
    </div>
  );
}

// ✅ Good: 容器组件处理逻辑
function AgentList() {
  const agents = useAgentStore(s => s.agents);
  const selectAgent = useChatStore(s => s.selectAgent);

  return (
    <div>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} onClick={selectAgent} />
      ))}
    </div>
  );
}
```

### shadcn/ui 使用

- 基础组件用 shadcn/ui（Button, Card, Input, Dialog, Tabs 等）
- `packages/client/src/components/ui/` 目录由 shadcn CLI 管理，不要手动改
- 业务组件在 `components/` 其他目录

## 样式规范

### Tailwind 优先

```tsx
// ✅ Good: Tailwind 类
<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-elevated" />

// ❌ Bad: 内联样式
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} />

// ❌ Bad: 单独 CSS 文件（除非是全局样式或动画）
```

### cn() 合并类名

```tsx
import { cn } from '@/lib/utils';

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-4',
        className,
      )}
      {...props}
    />
  );
}
```

### CSS 变量

全局 CSS 变量定义在 `styles/globals.css`，组件中通过 Tailwind 的 `bg-[var(--bg-surface)]` 或自定义 Tailwind theme 使用。

### 响应式

```tsx
// ✅ Good: 移动端优先
<div className="flex flex-col md:flex-row">
  <Sidebar className="hidden md:block w-64" />
  <main className="flex-1 p-4 md:p-6" />
</div>

// ❌ Bad: 桌面端优先
<div className="flex flex-row flex-col-reverse">
```

## 状态管理

### zustand store 规范

```typescript
// stores/worldStore.ts
import { create } from 'zustand';

interface WorldState {
  worldTime: Date;
  tick: number;
  paused: boolean;
  events: WorldEvent[];
}

interface WorldActions {
  setWorldTime: (time: Date) => void;
  addEvent: (event: WorldEvent) => void;
  setPaused: (paused: boolean) => void;
  clearEvents: () => void;
}

type WorldStore = WorldState & WorldActions;

export const useWorldStore = create<WorldStore>((set) => ({
  // State
  worldTime: new Date(),
  tick: 0,
  paused: false,
  events: [],

  // Actions
  setWorldTime: (time) => set({ worldTime: time }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  setPaused: (paused) => set({ paused }),
  clearEvents: () => set({ events: [] }),
}));
```

### 使用 selector 避免 re-render

```tsx
// ✅ Good: selector
const worldTime = useWorldStore(s => s.worldTime);
const addEvent = useWorldStore(s => s.addEvent);

// ❌ Bad: 取整个 store
const store = useWorldStore();
```

### Store 职责划分

| Store | 管理内容 |
|-------|---------|
| `worldStore` | 世界时间、tick、暂停、事件列表 |
| `agentStore` | Agent 列表、选中 Agent、Agent 状态 |
| `chatStore` | 聊天消息、流式输出、当前聊天对象 |
| `platformStore` | 平台列表、帖子、统计数据 |

## WebSocket 规范

### 连接管理

```typescript
// services/ws.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(url);
        }, Math.min(1000 * 2 ** this.reconnectAttempts, 30000));
      }
    };
  }

  send(message: ClientMessage): void {
    this.ws?.send(JSON.stringify(message));
  }

  onMessage(handler: (msg: ServerMessage) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        handler(JSON.parse(event.data));
      };
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export const wsService = new WebSocketService();
```

### 消息处理 Hook

```typescript
// hooks/useWebSocket.ts
export function useWebSocket(url: string) {
  const addEvent = useWorldStore(s => s.addEvent);
  const setWorldTime = useWorldStore(s => s.setWorldTime);

  useEffect(() => {
    wsService.connect(url);

    wsService.onMessage((msg) => {
      switch (msg.type) {
        case 'event':
          addEvent(msg.event);
          break;
        case 'world_state':
          setWorldTime(new Date(msg.worldTime));
          break;
        // ...
      }
    });

    return () => wsService.disconnect();
  }, [url]);

  return { send: wsService.send };
}
```

## API 调用

```typescript
// services/api.ts
const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message ?? 'Request failed');
  }

  const data = await res.json();
  return data.data as T;
}

export const api = {
  getWorld: (id: string) => request<World>(`/worlds/${id}`),
  createWorld: (body: InitRequest) => request<InitResult>('/worlds/init', { method: 'POST', body: JSON.stringify(body) }),
  getAgents: (worldId: string) => request<Agent[]>(`/worlds/${worldId}/agents`),
  getMessages: (agentId: string) => request<Message[]>(`/agents/${agentId}/messages`),
  sendMessage: (agentId: string, content: string) => request<Message>(`/agents/${agentId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
};
```

## 动画规范

使用 framer-motion，不要用 CSS animation（除了简单的 pulse、spin）。

```tsx
import { motion, AnimatePresence } from 'framer-motion';

function EventCardList({ events }: { events: WorldEvent[] }) {
  return (
    <AnimatePresence>
      {events.map(event => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <EventCard event={event} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

### 性能注意

- `AnimatePresence` 只包裹需要动画的列表
- 大量元素用 `layout` 动画要谨慎
- 避免在 `onMouseMove` 中触发动画

## 性能规范

### 虚拟列表

事件列表和 Agent 列表数据量大时使用虚拟滚动：

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function EventList({ events }: { events: WorldEvent[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(item => (
          <EventCard key={item.key} event={events[item.index]} style={{ position: 'absolute', top: item.start }} />
        ))}
      </div>
    </div>
  );
}
```

### 图片优化

- 上传的图片做压缩和缩略图
- Agent 生成的图片用懒加载
- 使用 `loading="lazy"` 和 `srcset`

### memo 使用

```tsx
// 只在 props 变化时重新渲染
const AgentCard = React.memo(function AgentCard({ agent }: AgentCardProps) {
  return <div>{agent.profile.name}</div>;
});
```

## 错误处理

### 边界错误

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-4 text-center">
      <p className="text-red-500">出了点问题</p>
      <p className="text-sm text-muted">{error.message}</p>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

### 网络错误

- API 调用失败时显示 toast 提示
- WebSocket 断开时显示连接状态指示器
- 自动重连，不阻塞 UI

## 测试规范

### 单元测试

```typescript
// __tests__/components/EventCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EventCard } from '../components/world/EventCard';

describe('EventCard', () => {
  it('renders event description', () => {
    const event = { id: '1', description: 'Test event', type: 'routine' };
    render(<EventCard event={event} onChoiceSelect={() => {}} />);
    expect(screen.getByText('Test event')).toBeDefined();
  });
});
```

### 测试文件位置

- 与组件同目录：`__tests__/EventCard.test.tsx`
- 或统一放 `tests/` 目录

---

> 相关文档：[前端 UI 设计](./frontend-ui.md) | [后端开发规范](./backend-conventions.md) | [技术栈](./tech-stack.md)

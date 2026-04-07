# 部署与分发

> 最后更新：2026-04-08 | 版本 v0.01

---

## 安装方式

```bash
npm install -g lore
lore
```

首次运行自动：
1. 创建 `~/.lore/` 数据目录
2. 初始化 SQLite 数据库
3. 启动世界引擎
4. 打开浏览器 -> `http://localhost:3952`

## 数据目录

```
~/.lore/
+-- config.json          # 配置（API Key、模型、时间流速、玩家模式等）
+-- lore.db              # SQLite 数据库（所有游戏数据）
+-- presets/             # 世界预设（用户安装的）
|   +-- 大明·建文元年/
|   +-- 硅谷·2024/
+-- saves/               # 游戏存档
+-- assets/              # 头像、背景等资源
+-- logs/                # 运行日志
```

## 配置 Schema

`~/.lore/config.json` 使用 Zod 做运行时校验：

```typescript
// packages/server/src/config/loader.ts

const ConfigSchema = z.object({
  llm: z.object({
    providers: z.array(z.object({
      name: z.string(),
      type: z.enum(['openai-compatible', 'anthropic', 'google']),
      baseUrl: z.string().optional(),
      apiKey: z.string(),
      models: z.array(z.string()),
    })),
    defaults: z.object({
      premiumModel: z.string(),    // 核心角色、玩家交互
      standardModel: z.string(),   // 活跃 NPC
      cheapModel: z.string(),      // 背景角色
      embedModel: z.string(),      // 向量嵌入
    }),
    limits: z.object({
      maxConcurrent: z.number().int().min(1).max(100).default(5),
      maxTokensPerRequest: z.number().int().min(256).max(128000).default(4096),
      dailyBudget: z.number().nullable().default(null),
      timeoutMs: z.number().int().min(5000).max(120000).default(30000),
    }),
  }),
  world: z.object({
    defaultPlayerMode: z.enum(['character', 'god']).default('character'),
    defaultTimeSpeed: z.number().min(0.1).max(100).default(1),
    defaultTickIntervalMs: z.number().int().min(500).max(60000).default(3000),
    maxAgents: z.number().int().min(1).max(1000).default(10),
    autoSaveIntervalMin: z.number().min(1).max(60).default(5),
    pausedOnStartup: z.boolean().default(false),
  }),
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3952),
    host: z.string().default('0.0.0.0'),
    cors: z.boolean().default(true),
    maxConnections: z.number().int().min(1).max(1000).default(100),
  }),
  dataDir: z.string().default('~/.lore'),
  monitor: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    logToFile: z.boolean().default(true),
    agentLogRetention: z.number().int().min(1).max(90).default(7),
    tokenTracking: z.boolean().default(true),
  }),
});

type LoreConfig = z.infer<typeof ConfigSchema>;
```

**配置加载优先级**（高到低）：

```
1. 环境变量（LORE_PORT, LORE_LLM_API_KEY, LLM_BASE_URL 等）
2. 命令行参数（lore --port 8080）
3. ~/.lore/config.json
4. 默认值（代码内硬编码）
```

## LLM Provider 配置示例

用户在配置中声明多个 Provider，系统根据模型名自动路由：

```json
{
  "llm": {
    "providers": [
      {
        "name": "deepseek",
        "type": "openai-compatible",
        "baseUrl": "https://api.deepseek.com/v1",
        "apiKey": "sk-xxx",
        "models": ["deepseek-v3"]
      },
      {
        "name": "kimi",
        "type": "openai-compatible",
        "baseUrl": "https://api.moonshot.cn/v1",
        "apiKey": "sk-xxx",
        "models": ["kimi-k2.5"]
      },
      {
        "name": "claude",
        "type": "anthropic",
        "apiKey": "sk-ant-xxx",
        "models": ["claude-sonnet-4-20250514"]
      }
    ],
    "defaults": {
      "premiumModel": "kimi-k2.5",
      "standardModel": "deepseek-v3",
      "cheapModel": "deepseek-v3",
      "embedModel": "deepseek-v3"
    }
  }
}
```

UI 操作：选厂商模板 -> 自动填 baseURL -> 填 API Key -> 选模型。也可以手动填任意 OpenAI 兼容的 baseURL。

## 手机访问

- **同一 WiFi**：`http://电脑IP:3952`，PWA 加到桌面
- **外网**：cloudflared / ngrok（文档指引）
- PWA 安装后支持 Web Push 推送通知（Agent 主动通知你"小美发了一条朋友圈"）

---

> 相关文档：[项目概述](./overview.md) | [技术栈](./tech-stack.md) | [LLM 接入](../llm/providers.md)

# 人格系统

> 最后更新：2026-04-08 | 版本 v0.01

---

## AgentProfile — 人格档案

```typescript
// packages/shared/src/types/agent.ts

export interface AgentProfile {
  /** 名字 */
  name: string;

  /** 年龄 */
  age: number;

  /** 性别 */
  gender: string;

  /** 职业 */
  occupation: string;

  /** 性格描述（给 LLM 用的自然语言描述） */
  personality: string;

  /** 背景故事 */
  background: string;

  /** 说话风格 */
  speechStyle: string;

  /** 喜欢的事物 */
  likes: string[];

  /** 讨厌的事物 */
  dislikes: string[];

  /** 头像（URL 或本地路径） */
  avatarUrl?: string;
}
```

## BehaviorConfig — 行为偏好

控制 Agent 的行为倾向，影响 LLM 的 prompt 构造。

```typescript
export interface BehaviorConfig {
  /** 社交活跃度 0-1（0=宅，1=社交达人） */
  sociability: number;

  /** 冒险倾向 0-1（0=保守，1=爱冒险） */
  riskTaking: number;

  /** 感情表达 0-1（0=内敛，1=直白） */
  emotionalExpression: number;

  /** 事业心 0-1（0=躺平，1=卷王） */
  ambition: number;

  /** 好奇心 0-1 */
  curiosity: number;

  /** 发朋友圈频率 0-1（0=不发，1=一天发三条） */
  socialMediaActivity: number;

  /** 作息类型 'early_bird' | 'night_owl' | 'normal' */
  sleepPattern: 'early_bird' | 'night_owl' | 'normal';
}
```

## AgentStats — 数值属性

Agent 的可量化状态，随事件和行为动态变化。

```typescript
export interface AgentStats {
  /** 心情 0-100 */
  mood: number;

  /** 健康 0-100 */
  health: number;

  /** 精力 0-100（每小时自动恢复/消耗） */
  energy: number;

  /** 金钱 */
  money: number;
}
```

**数值变化规则**：

| 事件 | mood | health | energy | money |
|------|------|--------|--------|-------|
| 起床 | +5 | - | 30 -> 100 | - |
| 上班 | -5~+10 | - | -30 | +salary |
| 加班 | -15 | -5 | -40 | +overtime |
| 和朋友聚会 | +15 | - | -20 | -100~500 |
| 被批评 | -20 | - | -10 | - |
| 运动 | +10 | +5 | -20 | - |
| 生病 | -30 | -20 | -30 | -医药费 |
| 恋爱确认 | +30 | - | - | -约会花费 |
| 分手 | -40 | - | -20 | - |

## AgentState — 运行状态

```typescript
export type AgentStatus = 'idle' | 'active' | 'sleeping' | 'dead';

export interface AgentState {
  /** 当前状态 */
  status: AgentStatus;

  /** 正在做什么 */
  currentActivity: string;

  /** 当前位置 */
  currentLocation: string;

  /** 上次活跃 tick */
  lastActiveTick: number;
}
```

## PersonProfile 生成

Agent 的人格可以来自：
1. **世界预设**（YAML 文件定义好的角色）
2. **LLM 生成**（给定基本参数，让 LLM 生成完整的性格描述和背景故事）
3. **上帝模式手动创建**

---

> 相关文档：[AgentRuntime](./runtime.md) | [行为引擎](./behavior.md) | [Prompt 模板](./prompts.md)

# 世界模拟器底层框架技术方案

> 版本: v1.0 | 日期: 2026-04-25 | 作者: AI Assistant

---

## 文档概述

| 项目 | 说明 |
|------|------|
| **目标** | 设计并实现一个完整的世界模拟器底层框架 |
| **核心问题** | 如何高效模拟一个真实的世界，而不是简单的聊天系统 |
| **预估代码量** | 核心框架10万+行，完整实现可能100万+行 |
| **实现周期** | 分6个Phase，预计6-12个月 |
| **关键约束** | Token成本必须可控（每天不超过$10）、性能必须稳定（tick不超载） |

---

## 第一部分：设计哲学与核心原则

### 1.1 核心哲学

**世界模拟器不是一个聊天系统，而是一个真实世界的模拟。**

```
核心理念：
├── 世界有自己的运行规则，不围着用户转
├── Agent有完整的人生，不受限制
├── 影响力可以跨越地理距离
├── 永远用不到的东西永远不运行
└── 能用代码算的绝不用AI
```

### 1.2 五大核心原则

#### 原则1：大而全的底层，精而简的运行

```
数据大而全：
├── 全球地理数据（约5000个城市）
├── 全球天文数据（太阳系、月相、季节）
├── 全球气候数据（气候带、温度模型）
├── 全球组织数据（UN、跨国公司）
└── 完整数据，但按需加载

运行精而简：
├── 只运行和用户相关的部分
├── 虚实分级：Level0-3不同运行级别
├── 按需激活：用户行为触发升级
└── 永远用不到的东西永远不运行
```

#### 原则2：代码优先，AI辅助

```
Token消耗分级：
├── Level0：100%代码（0 Token）
│   ├──天文计算（数学公式）
│   ├── 时区转换（固定规则）
│   ├── 距离计算（数学公式）
│   ├── 天气温度（气候模型）
│   ├── 状态更新（规则引擎）
│   └── 虚实分级（算法）
│
├── Level1：模板填充（少量Token）
│   ├── 天气描述（模板随机）
│   ├── 新闻标题（模板填充）
│   ├── 日常事件（模板填充）
│   └── 商品描述（模板填充）
│
├── Level2：LLM生成（高Token消耗）
│   ├── Agent性格（初始化一次性）
│   ├── Agent决策（仅Level0 Agent）
│   ├── 对话内容（用户主动聊天）
│   └── 重要事件叙事（严格控制频率）
│
└── Level3：按需生成（延迟到用户需要）
    ├── 远方人物生平（用户交流时）
    ├── 公司详细运营（用户入职时）
    ├── 城市详细数据（用户旅行时）
    └── 永远用不到→ 永远不生成
```

#### 原则3：影响力穿透地理

```
影响力分级：
├── Global级：全球影响力
│   ├── 跨国公司：Apple、Google、Facebook
│   ├── 全球新闻：CNN、BBC
│   ├── 全球平台：Twitter、YouTube
│   ├── 全球组织：UN、WHO
│   └── 运行级别：概念级（Level2）
│   └── 特点：即使用户在中国，也要关注
│   └── 不运行具体：但存概念
│   └── 按需生成：用户入职时才生成详细内容
│
├── National级：国家影响力
│   ├── 中国：腾讯、阿里、字节
│   ├── 运行级别：半实（Level1）
│   └── 特点：影响本国所有人
│
├── City级：城市影响力
│   ├── 本地公司、学校、医院
│   ├── 运行级别：全实（Level0）
│   └── 特点：用户日常接触
│
└── Block级：街区影响力
    ├── 街边的店、邻居
    ├── 运行级别：全实（Level0）
    └── 特点：用户每天经过
```

#### 原则4：动态虚实转换

```
升级触发：
├── 用户行为
│   ├── 入职Facebook → 概念级→ 全实
│   ├── 旅行到洛杉矶 → 纯虚→ 全实
│   ├── 投资美股 → 概念级→ 半实
│   └── 和某人交流 → 概念级→ 半实
│
├── Agent行为
│   ├── 朋友搬到美国 → 纯虚→ 半实
│   └── 公司扩张海外 → 城市级→ 全球级
│
├── 事件触发
│   ├── 重大事件（战争、灾难）→ 受影响地区升级
│   └── 公司发布重大产品 → 相关公司升级
│
降级触发：
├── 用户离开某城市 → 全实→ 半实
├── 用户离职某公司 → 全实→ 概念级
└── 时间衰减 → 无关联实体逐步降级
```

#### 原则5：性能绝对稳定

```
硬性约束：
├── 单tick耗时 < 500ms（超时强制终止）
├── 内存占用 < 500MB
├── Agent数量：全实20-50个，半实100-200个
├── LLM并发：动态调整（3-10）
├── Token成本：每天不超过$10
│
自动降级：
├── 连续3次超时 → 降低Level1频率
├── 连续5次超时 → 降低Level0频率
├── LLM队列>40 → 丢弃低优先级
├── 内存>80% → 清理缓存
│
恢复机制：
├── 性能恢复 → 自动恢复原频率
├── 内存清理 → 后台逐步清理
└── LLM恢复 → 逐步放开并发
```

---

## 第二部分：系统架构总览

### 2.1 世界模拟器11层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    世界模拟器11层架构                                  │
│                        （从宏观到微观）                               │
└─────────────────────────────────────────────────────────────────────┘

Layer 0:宇宙层（100%代码）
├── 天文引擎
│   ├── 季节计算（地球公转位置）
│   ├── 月相计算（月球公转周期）
│   ├── 日出日落（经纬度+日期）
│   ├── 潮汐计算（月相+地理位置）
│   └── Token消耗：0
│
Layer 1: 全球层（95%代码）
├── 全球地理
│   ├── 陆地/海洋分布
│   ├── 七大洲
│   ├── 24时区系统
│   ├── 气候带分布
│   └── 全球组织（UN、WHO）
│   ├── Token消耗：极少
│
Layer 2: 国家层（90%代码）
├── 约200个国家
├── 国家属性（人口、GDP、面积）
├── 政治体制分类
├── 法律框架（程序框架）
├── 军事框架
├── 外交关系框架
├── 国家级公司（腾讯、阿里）
├── Token消耗：极少
│
Layer 3: 区域层（100%代码）
├── 中国34个省级行政区
├── 美国50个州
├── 其他国家主要省/州
├── 区域属性（人口、面积）
├── Token消耗：0
│
Layer 4: 城市层（70%代码 + 30%模板）
├── 中国约3000个市县
├── 全球约2000个主要城市
├── 城市属性（经纬度、海拔）
├── 天气系统（代码计算+模板描述）
├── 城市设施框架
├── Token消耗：少量
│
Layer 5: 街区层（可选）
├── 街道、建筑
├── 按需生成（用户进入城市时）
│
Layer 6: 社会层（80%代码框架）
├── 人口统计模型
├── 就业市场框架
├── 教育系统框架
├── 医疗系统框架
├── 交通系统框架
├── 法律执行框架
├── 文化系统（节日+习俗）
│
Layer 7: 组织层（40%代码 + 60%按需生成）
├── 公司（按需生成）
├── 学校（按需生成）
├── 医院（按需生成）
├── 政府部门（框架固定）
│
Layer 8: 家庭层（30%代码 + 70% AI）
├── 家庭成员
├── 家庭住所
├── 家庭经济
├── 初始化时一次性生成
│
Layer 9: Agent层（20%代码 + 80% AI）
├── 基本信息（代码维护）
├── 地理位置（代码维护）
├── 性格特征（AI生成，初始化一次性）
├── 决策思考（AI，仅Level0 Agent）
├── 对话内容（AI，用户主动聊天）
│
Layer 10: 事件层（50%代码 + 50% AI）
├── 时间事件（代码触发+模板）
├── 概率事件（代码判断+模板）
├── 重要事件（代码触发+AI叙事）
│
Layer 11: 信息层（30%代码 + 70% AI）
├── 新闻系统（模板填充）
├── 社交平台（Agent发帖时AI）
├── 广告系统（模板）
```

### 2.2 底层基础设施架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    底层基础设施架构                                   │
│                        （核心框架）                                   │
└─────────────────────────────────────────────────────────────────────┘

基础设施层：
├── 核心调度层
│   ├── TickScheduler（分层tick）
│   ├── LLMScheduler（批量处理）
│   ├── TaskScheduler（任务队列）
│   └── 代码量：1500-2500行
│
├── 事件与推送层
│   ├── WorldEventSystem（世界事件）
│   ├── EventPropagationEngine（事件传播）
│   ├── PushManager（推送策略）
│   └── 代码量：1000-1500行
│
├── 虚实分级层
│   ├── VirtualityManager（虚实分级）
│   ├── InfluenceCalculator（影响力计算）
│   ├── OnDemandGenerator（按需生成）
│   └── 代码量：1000-1500行
│
├── 地理与天文层
│   ├── GeographyDB（地理数据库）
│   ├── AstronomyEngine（天文引擎）
│   ├── TimeSystem（时区系统）
│   ├── WeatherEngine（天气引擎）
│   └── 代码量：2000-3000行
│
├── 数据与内存层
│   ├── DataLoader（分层加载）
│   ├── MemoryManager（内存管理）
│   ├── CacheManager（缓存管理）
│   ├── PersistenceManager（持久化）
│   └── 代码量：800-1200行
│
├── 监控与性能层
│   ├── PerformanceMonitor（性能监控）
│   ├── ErrorManager（错误处理）
│   ├── AutoDegradation（自动降级）
│   ├── AlertSystem（预警系统）
│   └和 代码量：600-900行
│
├── 配置与状态层
│   ├── DynamicConfig（动态配置）
│   ├── StateStore（状态存储）
│   ├── SnapshotManager（快照管理）
│   └和 代码量：400-600行
│
底层框架总代码量：约6300-9200行
```

---

## 第三部分：核心系统详细设计

### 3.1 TickScheduler（分层tick调度器）

#### 设计目标

```
目标：
├── 分层tick：不同运行级别用不同频率
├── 性能稳定：单tick耗时<500ms
├── 自动降级：超载时自动调整
├── 超时保护：强制终止不阻塞
└── 性能监控：实时监控耗时
```

#### 核心设计

```typescript
// 分层tick设计
interface TickConfig {
  // Level0 tick：全实运行（每3秒）
  level0: {
    intervalMs: 3000;
    timeoutMs: 2400; // 80% of interval
    targets: 'Level0 Agents';
  };
  // Level1 tick：半实运行（每15秒）
  level1: {
    intervalMs: 15000;
    timeoutMs: 12000;
    targets: 'Level1 Agents';
  };
  // Level2 tick：概念级运行（每60秒）
  level2: {
    intervalMs: 60000;
    timeoutMs: 48000;
    targets: 'Level2 Entities';
  };
}

// 性能监控
interface TickMetrics {
  tickNumber: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  level: 'level0' | 'level1' | 'level2';
  agentsProcessed: number;
  eventsGenerated: number;
  llmCalls: number;
  timeoutHit: boolean;
}

// 自动降级
interface DegradationConfig {
  // 连续超时次数触发降级
  timeoutThresholds: {
    level0: 3; // 连续3次超时→降级
    level1: 5;
    level2: 10;
  };
  // 降级后频率调整
  frequencyAdjustment: {
    level0: { from: 3000, to: 5000 };
    level1: { from: 15000, to: 30000 };
    level2: { from: 60000, to: 120000 };
  };
  // 恢复条件
  recoveryCondition: {
    consecutiveSuccess: 5; // 连续5次成功→恢复
  };
}
```

#### 处理流程

```
Level0 tick（每3秒）：
├── 1. 时间推进（代码，0ms）
├── 2. 天气更新（代码+模板，<10ms）
├── 3. 事件生成（代码判断+模板，<50ms）
├── 4. Agent思考（批量LLM，<2000ms）
│   ├── 收集Level0 Agent列表（20-50个）
│   ├── 批量决策处理（一次LLM调用）
│   ├── 解析结果并应用
│   └── Token消耗：约5k（批量）
├── 5. 事件应用（代码，<50ms）
├── 6. 推送（批量推送，<50ms）
├── 7. 持久化（每10tick，<100ms）
└── 总耗时：<500ms（正常）

Level1 tick（每15秒）：
├── 1. 半实Agent简化思考（<1000ms）
├── 2. 国家级事件检查（<50ms）
├── 3. 统计数据更新（代码，<10ms）
└── 总耗时：<150ms

Level2 tick（每60秒）：
├── 1. 全球事件检查（<50ms）
├── 2. 概念级数据更新（<10ms）
├── 3. 清理过期数据（<50ms）
└── 总耗时：<100ms
```

### 3.2 LLMScheduler（批量处理调度器）

#### 设计目标

```
目标：
├── 动态并发控制：根据队列调整
├── 批量Agent决策：一次LLM处理多个
├── 模型选择策略：不同任务不同模型
├── 智能丢弃：队列满时优先级丢弃
├── 熔断器：连续失败自动熔断
└── Token优化：批量处理节省80%
```

#### 批量决策处理核心设计

```typescript
// 批量决策请求
interface BatchDecisionRequest {
  agents: Array<{
    id: string;
    profile: AgentProfile;
    stats: AgentStats;
    state: AgentState;
    pendingEvents: string[];
  }>;
  worldState: WorldStateSummary;
}

// 批量决策Prompt设计
const batchDecisionPrompt = `
你是批量决策引擎，同时处理多个Agent的决策。

当前世界时间：${worldState.currentTime}（第 ${worldState.day} 天）

以下是${agents.length}个Agent的状态和待处理事件：

${agents.map((a, i) => `
【Agent ${i + 1}】${a.profile.name}
- 职业：${a.profile.occupation}
- 心情：${a.stats.mood}/100
- 精力：${a.stats.energy}/100
- 正在：${a.state.currentActivity}
- 待处理事件：${a.pendingEvents.join('\n')}
`).join('\n')}

请为每个Agent返回决策（JSON数组）：
[
  {
    "agentIndex": 0,
    "action": "做什么",
    "reasoning": "内心想法",
    "moodChange": 0,
    "say": "说的话（如果有）"
  },
  ...
]
`;

// Token消耗对比
单独处理：
├── 50个Agent × 2000 tokens = 100k tokens

批量处理：
├── 1次LLM调用处理50个Agent
├── Prompt：约3000 tokens
├── Response：约5000 tokens
├── 总消耗：约8000 tokens
└── 节省：92%
```

#### 动态并发控制

```typescript
interface ConcurrentConfig {
  // 根据队列长度动态调整
  dynamicAdjustment: {
    queueLow: { threshold: 10, concurrent: 3 };
    queueMedium: { threshold: 30, concurrent: 5 };
    queueHigh: { threshold: 50, concurrent: 10 };
  };
  // API限制考虑
  apiLimits: {
    openai: { maxConcurrent: 10 };
    anthropic: { maxConcurrent: 5 };
    deepseek: { maxConcurrent: 10 };
  };
  // 自动调整逻辑
  adjustLogic: `
    当前队列长度：queueLength
    当前并发：currentConcurrent
    
    if (queueLength < 10) {
      targetConcurrent = 3;
    } else if (queueLength < 30) {
      targetConcurrent = 5;
    } else if (queueLength < 50) {
      targetConcurrent = min(10, apiMax);
    }
    
    逐步调整：每次增加/减少1个
  `;
}
```

#### 模型选择策略

```typescript
interface ModelSelectionStrategy {
  // 任务类型→模型映射
  taskModelMap: {
    'user-chat': 'premiumModel'; // 用户聊天，最重要
    'batch-decision': 'cheapModel'; // 批量决策，用便宜模型
    'single-decision': 'standardModel'; // 单个决策
    'creative': 'premiumModel'; // 创意内容
    'world-event': 'standardModel'; // 世界事件
  };
  
  // 模型成本对比
  modelCosts: {
    'gpt-4': { input: 0.03/1k, output: 0.06/1k };
    'gpt-3.5-turbo': { input: 0.0015/1k, output: 0.002/1k };
    'deepseek': { input: 0.001/1k, output: 0.002/1k };
  };
  
  // 成本优化
  optimization: `
    用户聊天（1000 tokens）：gpt-4 = $0.03
    批量决策（8000 tokens）：deepseek = $0.01
    
    每天估算：
    ├── 用户聊天：10次 × $0.03 = $0.3
    ├── 批量决策：1000次 × $0.01 = $10
    └── 总成本：约$10/天
    
    如果用gpt-4单独处理：
    ├── 50个Agent × 2000 tokens × $0.03 = $3/tick
    ├── 1200tick/小时 × $3 = $3600/小时
    └── 完全不可接受
  `;
}
```

### 3.3 VirtualityManager（虚实分级管理器）

#### 设计目标

```
目标：
├── 实体运行级别计算
├── 动态升降级触发
├── 影响力穿透计算
├── 关联度计算
└── 兴趣匹配计算
```

#### 虚实分级算法

```typescript
interface VirtualityAlgorithm {
  // 分级计算公式
  calculateLevel(entity: Entity, user: User): number {
    // 1. 地理距离因素（基础参考）
    const geoScore = this.calculateGeoScore(entity, user);
    
    // 2. 影响力因素（可穿透地理）
    const influenceScore = entity.influenceLevel;
    // Global: 50, National: 30, City: 10, Block: 5
    
    // 3. 关联度因素（用户关联）
    const relationScore = this.calculateRelationScore(entity, user);
    // 直接关联：100，间接关联：30，无关联：0
    
    // 4. 兴趣匹配因素
    const interestScore = this.calculateInterestScore(entity, user);
    // 匹配：20，部分匹配：10，不匹配：0
    
    // 综合
    const totalScore = geoScore + influenceScore + relationScore + interestScore;
    
    // 分级
    if (totalScore >= 150) return 0; // 全实
    if (totalScore >= 80) return 1; // 半实
    if (totalScore >= 40) return 2; // 概念级
    return 3; // 纯虚
  }
  
  // 地理距离计算
  calculateGeoScore(entity: Entity, user: User): number {
    if (entity.cityId === user.cityId) return 100;
    if (entity.countryId === user.countryId) return 50;
    return 10; // 其他国家
  }
  
  // 关联度计算
  calculateRelationScore(entity: Entity, user: User): number {
    if (entity.type === 'agent') {
      // 检查是否直接关联
      const relation = user.relationships.get(entity.id);
      if (relation && relation.intimacy > 30) return 100;
      if (relation) return 30;
    }
    if (entity.type === 'company') {
      // 检查是否用户所在公司
      if (user.companyId === entity.id) return 100;
    }
    return 0;
  }
}
```

#### 升降级触发

```typescript
interface LevelChangeTrigger {
  // 升级触发
  upgradeTriggers: {
    // 用户入职公司
    userJoinCompany: {
      trigger: 'user入职';
      target: 'company';
      fromLevel: 2; // 概念级
      toLevel: 0; // 全实
      action: '生成公司详细内容、同事Agent';
    };
    
    // 用户旅行
    userTravelToCity: {
      trigger: 'user到达城市';
      target: 'city';
      fromLevel: 3; // 纯虚
      toLevel: 0; // 全实
      action: '生成城市Agent、设施';
    };
    
    // 用户交流
    userChatWithAgent: {
      trigger: 'user开始聊天';
      target: 'agent';
      fromLevel: 2; // 概念级
      toLevel: 1; // 半实
      action: '生成生平';
    };
    
    // 重大事件
    majorEvent: {
      trigger: '事件发生';
      target: 'region';
      condition: '事件影响范围';
      action: '受影响地区升级';
    };
  };
  
  // 降级触发
  downgradeTriggers: {
    // 用户离开
    userLeaveCity: {
      trigger: 'user离开城市';
      target: 'city';
      fromLevel: 0;
      toLevel: 1;
      delay: '30分钟后降级'; // 给用户返回的机会
    };
    
    // 用户离职
    userLeaveCompany: {
      trigger: 'user离职';
      target: 'company';
      fromLevel: 0;
      toLevel: 2;
      delay: '立即降级';
    };
    
    // 时间衰减
    timeDecay: {
      trigger: '无关联时间';
      target: 'all';
      rule: `
        Level0 Agent：无用户交互30分钟 → Level1
        Level1 Agent：无用户交互2小时 → Level2
        Level2 Agent：无用户交互24小时 → Level3
      `;
    };
  };
}
```

### 3.4 WorldEventSystem（世界事件系统）

#### 设计目标

```
目标：
├── 事件分级（Global/National/City/Personal）
├── 事件触发（代码规则引擎）
├── 事件影响范围计算
├── 事件传播机制
├── 事件叙事（模板+AI）
└── 事件后果（代码执行）
```

#### 事件分级

```typescript
interface EventHierarchy {
  // Global事件：影响全球
  global: {
    examples: ['世界大战', '全球疫情', '重大科技突破'];
    influence: 'Global';
    runLevel: 2; // 概念级处理
    narrative: 'AI生成详细叙事';
    propagation: '全球推送';
  };
  
  // National事件：影响国家
  national: {
    examples: ['政策变化', '经济危机', '选举'];
    influence: 'National';
    runLevel: 1; // 半实处理
    narrative: 'AI生成（如果用户在该国）';
    propagation: '国家推送';
  };
  
  // City事件：影响城市
  city: {
    examples: ['天气变化', '本地活动', '交通事故'];
    influence: 'City';
    runLevel: 0; // 全实处理（如果用户在该城市）
    narrative: '模板填充';
    propagation: '城市推送';
  };
  
  // Personal事件：影响个人
  personal: {
    examples: ['生病', '恋爱', '失业'];
    influence: 'Personal';
    runLevel: 0; // 全实处理
    narrative: 'AI生成（仅相关Agent）';
    propagation: '仅推送给相关Agent';
  };
}
```

#### 事件触发规则引擎

```typescript
interface EventTriggerEngine {
  // 时间驱动事件（代码判断）
  timeDriven: {
    // 每日事件
    daily: [
      { hour: 7, event: 'morning_rise', template: '{name}起床了' },
      { hour: 9, event: 'work_start', template: '{name}开始上班' },
      { hour: 12, event: 'lunch', template: '{name}在吃午饭' },
      { hour: 18, event: 'work_end', template: '{name}下班了' },
      { hour: 22, event: 'sleep', template: '{name}准备睡觉' },
    ];
    
    // 季节事件
    seasonal: [
      { season: 'spring', month: 3, event: 'spring_festival' },
      { season: 'summer', month: 6, event: 'summer_heat' },
      { season: 'autumn', month: 9, event: 'harvest' },
      { season: 'winter', month: 12, event: 'winter_cold' },
    ];
    
    // 节日事件
    holidays: [
      { date: '01-01', event: '新年' },
      { date: '02-14', event: '情人节' },
      { date: '05-01', event: '劳动节' },
      { date: '10-01', event: '国庆节' },
    ];
    
    // Token消耗：0（代码判断）
  };
  
  // 状态驱动事件（代码判断）
  stateDriven: {
    // Agent状态阈值事件
    agentThresholds: [
      { stat: 'health', threshold: 30, event: 'health_warning' },
      { stat: 'mood', threshold: 20, event: 'depression' },
      { stat: 'money', threshold: 100, event: 'financial_crisis' },
      { stat: 'energy', threshold: 20, event: 'exhaustion' },
    ];
    
    // Token消耗：0（代码判断）
  };
  
  // 概率事件（代码判断）
  probabilityDriven: {
    // 随机偶遇
    randomEncounter: { probability: 0.05, event: '偶遇' };
    
    // 意外事件
    accident: { probability: 0.01, event: '意外' };
    
    // 好运
    goodLuck: { probability: 0.02, event: '好运' };
    
    // Token消耗：0（代码判断）
  };
  
  // 影响力穿透事件
  influenceDriven: {
    // 公司发布产品
    companyProductLaunch: {
      trigger: 'Global级公司发布产品';
      influence: 'Global';
      narrative: '新闻推送（模板）';
      detailedGeneration: '仅当用户入职该公司';
    };
    
    // 名人获奖
    celebrityAward: {
      trigger: 'Global级人物获奖';
      influence: 'Global';
      narrative: '新闻推送';
      detailedGeneration: '仅当用户交流';
    };
  };
}
```

#### 事件传播机制

```typescript
interface EventPropagation {
  // 传播规则
  propagationRules: {
    // 源头事件→ 其他地区
    globalEvent: {
      source: '事件发生地';
      propagation: '全球推送新闻';
      detail: '仅源头地区生成详细内容';
    };
    
    nationalEvent: {
      source: '国家';
      propagation: '本国推送';
      detail: '仅用户所在城市生成详细';
    };
    
    cityEvent: {
      source: '城市';
      propagation: '本市推送';
      detail: '仅Level0 Agent处理';
    };
  };
  
  // 新闻推送策略
  newsPush: {
    // 用户无关事件：只推送新闻
    irrelevantEvent: {
      pushType: 'news_only';
      content: '新闻标题（模板）';
      detail: '不生成';
    };
    
    // 用户相关事件：推送详细
    relevantEvent: {
      pushType: 'detailed';
      content: 'AI生成叙事';
      detail: '生成完整内容';
    };
  };
}
```

### 3.5 GeographyDB（地理数据库）

#### 设计目标

```
目标：
├── 全球国家数据（约200个）
├── 全球省/州数据（主要国家）
├── 全球城市数据（约5000个）
├── 时区映射
├── 气候类型映射
├── 海拔数据
└── 分层加载（按需）
```

#### 数据结构

```typescript
interface GeographicData {
  // 国家数据
  countries: Country[];
  
  // 省/州数据
  provinces: Province[];
  
  // 城市数据
  cities: City[];
  
  // 时区数据
  timezones: TimeZone[];
  
  // 气候带数据
  climateZones: ClimateZone[];
}

interface Country {
  id: string;           // "CN", "US", "JP"
  name: string;         // "中国", "美国", "日本"
  nameEn: string;       // "China", "United States"
  continent: string;    // "Asia", "North America"
  timezone: string;     // 默认时区
  population?: number;
  gdp?: number;
  area?: number;        // km²
}

interface Province {
  id: string;           // "CN-SH", "US-CA"
  countryId: string;
  name: string;
  timezone?: string;
  population?: number;
}

interface City {
  id: string;           // "CN-SH-SHANGHAI"
  provinceId: string;
  countryId: string;
  name: string;
  nameEn?: string;
  lat: number;          // 纬度
  lng: number;          // 经度
  elevation?: number;   // 海拔（米）
  timezone?: string;
  population?: number;
  climateType?: string; // "coastal", "mountain", "desert", "urban"
  cityType?: string;    // "capital", "major", "minor"
}
```

#### 数据文件规划

```
packages/server/src/data/geography/
├── countries.json           # 约200个国家
├── provinces-china.json     # 中国34个省级行政区
├── provinces-us.json        # 美国50个州
├── provinces-other.json     # 其他国家主要省/州
├── cities-china.json        # 中国约3000个市县
├── cities-global.json       # 全球约2000个主要城市
├── timezones.json           # 24时区数据
├── climate-zones.json       # 气候带分布
└── terrain.json             # 地形数据（可选）
```

#### 分层加载策略

```typescript
interface GeographyLoadingStrategy {
  // 启动时加载
  startupLoad: {
    countries: true;      // 约200条，很小
    timezones: true;      // 约24条，很小
    climateZones: true;   // 约10条，很小
  };
  
  // 用户所在国家加载
  userCountryLoad: {
    provinces: true;      // 用户所在国家的省/州
    cities: true;         // 用户所在国家的主要城市
  };
  
  // 按需加载
  onDemandLoad: {
    otherProvinces: false;  // 用户旅行到其他国家时加载
    otherCities: false;     // 用户旅行到其他城市时加载
  };
  
  // 缓存策略
  cacheStrategy: {
    L1: '内存缓存最近使用的100个城市';
    L2: '数据库缓存用户访问过的城市';
    LRU: '淘汰最少使用的数据';
  };
}
```

### 3.6 AstronomyEngine（天文引擎）

#### 设计目标

```
目标：
├── 季节计算（地球公转位置）
├── 月相计算（月球公转周期）
├── 日出日落（经纬度+日期）
├── 潮汐计算（月相+地理位置）
└── Token消耗：0（数学公式）
```

#### 季节计算

```typescript
class AstronomyEngine {
  // 季节计算（基于地球公转位置）
  getSeason(date: Date, lat: number): Season {
    // 计算地球在黄道上的位置
    const dayOfYear = this.getDayOfYear(date);
    
    // 黄道十二宫对应季节（北半球）
    // 春分（约第80天）：春季开始
    // 夏至（约第172天）：夏季开始
    // 秋分（约第266天）：秋季开始
    // 冬至（约第355天）：冬季开始
    
    if (lat >= 0) { // 北半球
      if (dayOfYear >= 80 && dayOfYear < 172) return 'spring';
      if (dayOfYear >= 172 && dayOfYear < 266) return 'summer';
      if (dayOfYear >= 266 && dayOfYear < 355) return 'autumn';
      return 'winter';
    } else { // 南半球（反转）
      if (dayOfYear >= 80 && dayOfYear < 172) return 'autumn';
      if (dayOfYear >= 172 && dayOfYear < 266) return 'winter';
      if (dayOfYear >= 266 && dayOfYear < 355) return 'spring';
      return 'summer';
    }
  }
  
  // 精确季节计算（考虑闰年）
  getExactSeason(date: Date): SeasonDetail {
    // 使用天文算法计算太阳黄经
    // 春分：太阳黄经0°
    // 夏至：太阳黄经90°
    // 秋分：太阳黄经180°
    // 冬至：太阳黄经270°
    
    const sunLongitude = this.calculateSunLongitude(date);
    // ...天文算法实现
  }
}
```

#### 月相计算

```typescript
class MoonPhaseCalculator {
  // 月相周期：约29.53天
  private readonly MOON_CYCLE_DAYS = 29.53;
  
  // 计算月相百分比（0-100）
  getMoonPhasePercent(date: Date): number {
    // 以2000年1月6日（新月）为基准
    const baseDate = new Date('2000-01-06');
    const daysSinceBase = (date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // 计算当前月相位置
    const phasePosition = daysSinceBase % this.MOON_CYCLE_DAYS;
    const phasePercent = (phasePosition / this.MOON_CYCLE_DAYS) * 100;
    
    return phasePercent;
  }
  
  // 月相类型
  getMoonPhaseType(percent: number): MoonPhaseType {
    if (percent < 5 || percent > 95) return 'new';      // 新月
    if (percent >= 5 && percent < 25) return 'waxing_crescent';
    if (percent >= 25 && percent < 35) return 'first_quarter';
    if (percent >= 35 && percent < 50) return 'waxing_gibbous';
    if (percent >= 50 && percent < 55) return 'full';   // 满月
    if (percent >= 55 && percent < 70) return 'waning_gibbous';
    if (percent >= 70 && percent < 80) return 'last_quarter';
    return 'waning_crescent';
  }
}
```

#### 日出日落计算

```typescript
class SunriseSunsetCalculator {
  // 基于经纬度+日期计算日出日落时间
  calculate(date: Date, lat: number, lng: number): SunriseSunsetResult {
    // 使用天文算法（简化版）
    // 参考：https://en.wikipedia.org/wiki/Sunrise_equation
    
    const dayOfYear = this.getDayOfYear(date);
    
    // 计算太阳赤纬
    const declination = -23.45 * Math.cos((360/365) * (dayOfYear + 10) * Math.PI / 180);
    
    // 计算日出日落时角
    const hourAngle = Math.acos(
      (Math.sin(-0.833 * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(declination * Math.PI / 180)) /
      (Math.cos(lat * Math.PI / 180) * Math.cos(declination * Math.PI / 180))
    ) * 180 / Math.PI;
    
    // 转换为时间
    const sunriseHour = 12 - hourAngle / 15;
    const sunsetHour = 12 + hourAngle / 15;
    
    // 考虑时区
    const timezoneOffset = lng / 15;
    
    return {
      sunrise: this.hourToDate(sunriseHour - timezoneOffset, date),
      sunset: this.hourToDate(sunsetHour - timezoneOffset, date),
      daylightHours: sunsetHour - sunriseHour,
    };
  }
}
```

### 3.7 WeatherEngine（天气引擎）

#### 设计目标

```
目标：
├── 基于气候类型+季节计算温度范围
├── 基于概率生成天气状态
├── 极端天气事件
└── Token消耗：极少（代码+模板）
```

#### 气候模型

```typescript
interface ClimateModel {
  // 气候类型→ 温度/降水范围
  climateTypes: {
    tropical: {
      tempRange: { summer: [25, 35], winter: [20, 30] };
      precipitation: 'high';
      seasons: 'wet/dry';
    };
    subtropical: {
      tempRange: { summer: [25, 35], winter: [10, 20] };
      precipitation: 'moderate';
      seasons: 'four';
    };
    temperate: {
      tempRange: { summer: [20, 30], winter: [-5, 10] };
      precipitation: 'moderate';
      seasons: 'four';
    };
    continental: {
      tempRange: { summer: [25, 35], winter: [-20, 5] };
      precipitation: 'low';
      seasons: 'four';
    };
    polar: {
      tempRange: { summer: [0, 10], winter: [-40, -20] };
      precipitation: 'very_low';
      seasons: 'two';
    };
    desert: {
      tempRange: { summer: [35, 45], winter: [15, 25] };
      precipitation: 'very_low';
      seasons: 'two';
    };
  };
  
  // 城市气候类型映射
  cityClimateMap: {
    'CN-SH-SHANGHAI': 'subtropical';
    'CN-BJ-BEIJING': 'continental';
    'US-NY-NEWYORK': 'temperate';
    'US-CA-LOSANGELES': 'subtropical';
  };
}
```

#### 天气生成算法

```typescript
class WeatherEngine {
  generateWeather(cityId: string, date: Date): WeatherCondition {
    // 1. 获取城市气候类型
    const climateType = this.getCityClimate(cityId);
    
    // 2. 获取季节
    const season = this.astronomy.getSeason(date, this.getCityLat(cityId));
    
    // 3. 计算温度范围
    const tempRange = this.getTempRange(climateType, season);
    
    // 4. 随机生成温度（在范围内）
    const temperature = this.randomInRange(tempRange[0], tempRange[1]);
    
    // 5. 计算降水概率
    const precipProbability = this.getPrecipProbability(climateType, season);
    
    // 6. 随机生成天气状态
    const weatherState = this.generateWeatherState(temperature, precipProbability);
    
    // 7. 生成描述（模板）
    const description = this.generateDescription(weatherState, temperature);
    
    return {
      temperature,
      humidity: this.calculateHumidity(climateType),
      weatherState,
      description,
    };
  }
  
  // 天气状态描述模板
  generateDescription(state: WeatherState, temp: number): string {
    const templates = {
      sunny: ['今天阳光明媚', '天气晴朗', '万里无云'],
      cloudy: ['天空多云', '阴天', '云层较厚'],
      rainy: ['下雨了', '有小雨', '正在下雨'],
      snowy: ['下雪了', '大雪纷飞', '小雪'],
      foggy: ['有雾', '雾气较重', '能见度低'],
    };
    
    const base = randomChoice(templates[state]);
    return `${base}，气温${temp}°C`;
  }
}
```

---

## 第四部分：Token成本优化详细方案

### 4.1 Token消耗对比

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Token消耗对比                                       │
│                        （优化前vs优化后）                               │
└─────────────────────────────────────────────────────────────────────┘

场景：用户在上海，50个全实Agent

【未优化方案】：
每tick（3秒）：
├── 时间推进：100 tokens（LLM）
├── 天气更新：500 tokens（LLM）
├── 季节判断：200 tokens（LLM）
├── Agent思考：50 × 2000 = 100,000 tokens（单独LLM）
├── 事件生成：2000 tokens（LLM）
├── 每tick总计：约103,000 tokens

每小时（1200 tick）：
├── 总Token：约124,000,000 tokens

每天（24小时）：
├── 总Token：约2,976,000,000 tokens
├── 成本（GPT-4）：约$90,000/天
└── 完全不可接受！

【优化后方案】：
每tick（3秒）：
├── 时间推进：0 tokens（代码）
├── 天气更新：50 tokens（模板）
├── 季节判断：0 tokens（代码）
├── Agent思考：8,000 tokens（批量LLM，DeepSeek）
├── 事件生成：100 tokens（模板为主）
├── 每tick总计：约8,150 tokens

每小时（1200 tick）：
├── 总Token：约9,780,000 tokens

每天（24小时）：
├── 总Token：约235,000,000 tokens
├── 成本（DeepSeek）：约$2-5/天
└── 可以接受！
```

### 4.2 关键优化点

```
┌─────────────────────────────────────────────────────────────────────┐
│                    关键优化点                                          │
└─────────────────────────────────────────────────────────────────────┘

优化1：批量Agent决策（节省92%）
├── 原来：50个Agent × 2000 tokens = 100,000 tokens
├── 批量：一次LLM调用处理50个 = 8,000 tokens
├── 节省：92,000 tokens/tick
└── 关键：批量Prompt设计

优化2：代码替代LLM（节省100%）
├── 时间推进：代码 → 0 tokens
├── 季节计算：代码 → 0 tokens
├── 天气温度：代码 → 0 tokens
├── 状态更新：代码 → 0 tokens
├── 事件触发：代码 → 0 tokens
└── 节省：约800 tokens/tick

优化3：模板替代LLM（节省90%）
├── 天气描述：模板 → 50 tokens
├── 新闻标题：模板 → 100 tokens
├── 日常事件：模板 → 50 tokens
└── 节省：约1,500 tokens/tick

优化4：模型选择（节省95%成本）
├── 用户聊天：GPT-4 → $0.03/次
├── 批量决策：DeepSeek → $0.01/次
├── 成本差异：30倍
└── 关键：任务类型→模型映射

优化5：虚实分级（节省运行量）
├── Level0 Agent：20-50个（全实运行）
├── Level1 Agent：100-200个（每5tick运行）
├── Level2 Agent：不运行
├── Level3 Agent：不运行
└── 节省：约80%的Agent思考量

优化6：按需生成（节省初始化）
├── 远方人物：不预生成
├── 公司详情：不预生成
├── 城市详情：不预生成
├── 用户需要时才生成
└── 节省：大量初始化Token
```

---

## 第五部分：实现计划

### 5.1 Phase划分

```
┌─────────────────────────────────────────────────────────────────────┐
│                    实现Phase划分                                       │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: 底层基础设施框架（2周）
├── TickScheduler升级（分层tick）
├── LLMScheduler升级（批量处理）
├── ErrorManager（错误处理）
├── PerformanceMonitor升级（性能监控）
├── DynamicConfig（动态配置）
└── 代码量：约2000行

Phase 2: 虚实分级系统（2周）
├── VirtualityManager（虚实分级）
├── InfluenceCalculator（影响力计算）
├── LevelChangeTrigger（升降级触发）
├── OnDemandGenerator（按需生成）
└── 代码量：约1500行

Phase 3: 地理与天文系统（2周）
├── GeographyDB（地理数据库）
├── AstronomyEngine（天文引擎）
├── TimeSystem（时区系统）
├── WeatherEngine（天气引擎）
├── 数据文件准备
└── 代码量：约2500行

Phase 4: 世界事件系统升级（1周）
├── WorldEventSystem升级
├── EventTriggerEngine（规则引擎）
├── EventPropagation（事件传播）
├── NewsPushStrategy（新闻推送）
└── 代码量：约1000行

Phase 5: Agent系统升级（1周）
├── AgentLocation（地理位置）
├── TravelEngine（旅行系统）
├── AgentDecisionBatch（批量决策）
├── AgentRuntime升级
└── 代码量：约1000行

Phase 6: 数据管理与持久化（1周）
├── DataLoader（分层加载）
├── MemoryManager（内存管理）
├── CacheManager（缓存管理）
├── SnapshotManager升级
└── 代码量：约800行

总代码量：约8800行
总时间：约9周
```

### 5.2 优先级排序

```
优先级P0（必须立即实现）：
├── TickScheduler分层tick（核心调度）
├── LLMScheduler批量处理（Token优化核心）
├── PerformanceMonitor性能监控（稳定性保障）
├── ErrorManager错误处理（稳定性保障）
└── 原因：这些是整个系统稳定运行的基础

优先级P1（第二优先）：
├── GeographyDB地理数据（世界基础）
├── AstronomyEngine天文引擎（世界基础）
├── VirtualityManager虚实分级（运行效率）
├── TimeSystem时区系统（世界基础）
└── 原因：这些是世界模拟的核心数据

优先级P2（第三优先）：
├── WeatherEngine天气引擎
├── WorldEventSystem升级
├── OnDemandGenerator按需生成
├── InfluenceCalculator影响力计算
└── 原因：这些是丰富世界内容

优先级P3（后续）：
├── AgentLocation地理位置
├── TravelEngine旅行系统
├── DataLoader分层加载
├── MemoryManager内存管理
└── 原因：这些是细节优化
```

---

## 第六部分：风险评估与应对

### 6.1 主要风险

```
┌─────────────────────────────────────────────────────────────────────┐
│                    主要风险                                            │
└─────────────────────────────────────────────────────────────────────┘

风险1：性能不稳定
├── 问题：tick超时、内存溢出、LLM队列阻塞
├── 影响：系统崩溃、用户体验差
├── 应对：
│   ├── 超时保护：强制终止
│   ├── 自动降级：性能预警触发
│   ├── 内存监控：实时清理
│   └── 熔断器：LLM失败保护
└── 优先级：P0

风险2：Token成本失控
├── 问题：批量处理失效、模型选择错误
├── 影响：成本爆炸、无法运行
├── 应对：
│   ├── 实时Token监控
│   ├── 成本预警（超过$10/天）
│   ├── 自动切换便宜模型
│   ├── 强制使用模板
└── 优先级：P0

风险3：虚实分级失效
├── 问题：分级算法错误、升降级触发错误
├── 影响：性能浪费、用户体验差
├── 应对：
│   ├── 分级算法测试
│   ├── 升降级日志记录
│   ├── 手动调整接口
│   └── 默认降级策略
└── 优先级：P1

风险4：数据加载问题
├── 问题：数据文件缺失、加载超时
├── 影响：世界无法初始化
├── 应对：
│   ├── 数据完整性检查
│   ├── fallback数据
│   ├── 按需生成缺失数据
│   └── 数据加载日志
└── 优先级：P1

风险5：天文计算错误
├── 问题：季节计算错误、日出日落错误
├── 影响：天气错误、时间错误
├── 应对：
│   ├── 使用成熟算法
│   ├── 计算结果验证
│   ├── fallback默认值
│   └── 计算缓存
└── 优先级：P2
```

### 6.2 性能目标

```
┌─────────────────────────────────────────────────────────────────────┐
│                    性能目标                                            │
└─────────────────────────────────────────────────────────────────────┘

tick性能：
├── Level0 tick耗时：<500ms（正常）
├── Level0 tick耗时：<2400ms（超时阈值）
├── Level1 tick耗时：<200ms
├── Level2 tick耗时：<100ms
└── 超时处理：强制终止，记录日志

内存性能：
├── 启动内存：<200MB
├── 运行内存：<500MB
├── 最大内存：<1GB
└── 超限处理：清理缓存

LLM性能：
├── 队列长度：<50
├── 并发数：3-10（动态）
├── 单次LLM耗时：<30s
├── 熔断阈值：连续5次失败
└── 熔断时间：60s

Token性能：
├── 每tick消耗：<10,000 tokens
├── 每天消耗：<250,000,000 tokens
├── 每天成本：<$10
└── 超限处理：切换便宜模型、强制模板
```

---

## 第七部分：附录

### 7.1 代码文件规划

```
packages/server/src/
├── foundation/                     # 新增：底层框架
│   ├── scheduler/
│   │   ├── tiered-tick-scheduler.ts    # 分层tick调度器
│   │   ├── batch-llm-scheduler.ts      # 批量LLM调度器
│   │   ├── task-queue.ts               # 任务队列
│   │   └── degradation-manager.ts      # 降级管理
│   │
│   ├── virtuality/
│   │   ├── virtuality-manager.ts       # 虚实分级管理
│   │   ├── influence-calculator.ts     # 影响力计算
│   │   ├── level-change-trigger.ts     # 升降级触发
│   │   └── on-demand-generator.ts      # 按需生成
│   │
│   ├── geography/
│   │   ├── geography-db.ts             # 地理数据库
│   │   ├── time-system.ts              # 时区系统
│   │   ├── distance-calculator.ts      # 距离计算
│   │   └── location-manager.ts         # 位置管理
│   │
│   ├── astronomy/
│   │   ├── astronomy-engine.ts         # 天文引擎
│   │   ├── season-calculator.ts        # 季节计算
│   │   ├── moon-phase.ts               # 月相计算
│   │   ├── sunrise-sunset.ts           # 日出日落
│   │   └── tide-calculator.ts          # 潮汐计算
│   │
│   ├── weather/
│   │   ├── weather-engine.ts           # 天气引擎
│   │   ├── climate-model.ts            # 气候模型
│   │   └── weather-template.ts         # 天气模板
│   │
│   ├── event/
│   │   ├── world-event-system.ts       # 世界事件系统
│   │   ├── event-trigger-engine.ts     # 事件触发引擎
│   │   ├── event-propagation.ts        # 事件传播
│   │   └── news-push-strategy.ts       # 新闻推送策略
│   │
│   ├── performance/
│   │   ├── performance-monitor.ts      # 性能监控
│   │   ├── error-manager.ts            # 错误管理
│   │   ├── alert-system.ts             # 预警系统
│   │   └── auto-degradation.ts         # 自动降级
│   │
│   ├── data/
│   │   ├── data-loader.ts              # 数据加载
│   │   ├── memory-manager.ts           # 内存管理
│   │   ├── cache-manager.ts            # 缓存管理
│   │   └── lru-cache.ts                # LRU缓存
│   │
│   └── config/
│   │   ├── dynamic-config.ts           # 动态配置
│   │   ├── state-store.ts              # 状态存储
│   │   └── snapshot-manager.ts         # 快照管理
│
├── data/                           # 数据文件
│   ├── geography/
│   │   ├── countries.json
│   │   ├── provinces-china.json
│   │   ├── provinces-us.json
│   │   ├── cities-china.json
│   │   ├── cities-global.json
│   │   ├── timezones.json
│   │   └── climate-zones.json
│   │
│   ├── templates/
│   │   ├── weather-templates.json
│   │   ├── news-templates.json
│   │   ├── event-templates.json
│   │   └── description-templates.json
│   │
│   └── astronomy/
│   │   ├── solar-system.json
│   │   └── moon-cycle.json
│
└── tests/
    ├── foundation/
    │   ├── tiered-tick.test.ts
    │   ├── batch-llm.test.ts
    │   ├── virtuality.test.ts
    │   ├── astronomy.test.ts
    │   ├── weather.test.ts
    │   └── geography.test.ts
```

### 7.2 配置参数规划

```typescript
interface FoundationConfig {
  // Tick配置
  tick: {
    level0IntervalMs: 3000;
    level1IntervalMs: 15000;
    level2IntervalMs: 60000;
    timeoutRatio: 0.8;              // 超时比例
    degradationThreshold: 3;        // 连续超时次数
    recoveryThreshold: 5;           // 连续成功次数
  };
  
  // LLM配置
  llm: {
    maxConcurrentLow: 3;
    maxConcurrentMedium: 5;
    maxConcurrentHigh: 10;
    maxQueueSize: 50;
    batchSize: 50;                  // 批量处理Agent数量
    circuitBreakerThreshold: 5;
    circuitBreakerResetMs: 60000;
  };
  
  // 虚实分级配置
  virtuality: {
    level0Threshold: 150;           // 全实阈值
    level1Threshold: 80;            // 半实阈值
    level2Threshold: 40;            // 概念级阈值
    geoScoreSameCity: 100;
    geoScoreSameCountry: 50;
    geoScoreOther: 10;
    influenceScoreGlobal: 50;
    influenceScoreNational: 30;
    influenceScoreCity: 10;
    relationScoreDirect: 100;
    relationScoreIndirect: 30;
    interestScoreMatch: 20;
    downgradeDelayMs: 1800000;      // 降级延迟（30分钟）
  };
  
  // 性能配置
  performance: {
    maxMemoryMB: 500;
    alertMemoryRatio: 0.8;
    maxTokenPerDay: 250000000;
    maxCostPerDay: 10;              // USD
    alertQueueSize: 40;
  };
  
  // 天气配置
  weather: {
    updateIntervalMs: 60000;        // 天气更新频率
    extremeWeatherProbability: 0.01;
    climateTypeMap: {...};
  };
}
```

### 7.3 测试计划

```
单元测试：
├── TickScheduler测试
│   ├── 分层tick是否正确触发
│   ├── 超时是否正确终止
│   ├── 自动降级是否正确触发
│   └── 性能恢复是否正确恢复
│
├── LLMScheduler测试
│   ├── 批量处理是否正确合并
│   ├── 并发控制是否正确调整
│   ├── 熔断器是否正确触发
│   └── 模型选择是否正确
│
├── VirtualityManager测试
│   ├── 分级算法是否正确
│   ├── 升降级是否正确触发
│   ├── 影响力穿透是否正确
│   └── 关联度计算是否正确
│
├── AstronomyEngine测试
│   ├── 季节计算是否正确
│   ├── 月相计算是否正确
│   ├── 日出日落是否正确
│   ├── 不同纬度测试
│
├── WeatherEngine测试
│   ├── 温度范围是否正确
│   ├── 天气状态生成是否合理
│   ├── 模板描述是否正确
│
└── GeographyDB测试
    ├── 数据加载是否正确
    ├── 分层加载是否正确
    ├── 缓存是否正确工作

集成测试：
├── 完整tick流程测试
├── 用户旅行流程测试
├── 用户入职公司流程测试
├── 事件传播流程测试
├── Token消耗测试
└── 性能压力测试
```

---

## 结论

本技术方案定义了一个完整的世界模拟器底层框架，包含：

1. **设计哲学**：五大核心原则确保系统方向正确
2. **系统架构**：11层世界架构 + 7层基础设施架构
3. **核心系统**：详细设计TickScheduler、LLMScheduler、VirtualityManager等8个核心系统
4. **Token优化**：通过批量处理、代码替代、模板替代等手段将成本降低90%
5. **实现计划**：分6个Phase，约9周，8800行代码
6. **风险评估**：5大风险及应对策略

下一步：开始Phase 1实现，搭建底层基础设施框架。
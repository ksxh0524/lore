# Lore AI模块代码审核报告

> 审核日期：2026-04-26
> 审核范围：全部AI模块（LLM层、Agent层、World层）
> 状态：已完成修复

---

## 修复汇总

| 类别 | 发现问题数 | 已修复 | 待优化 |
|------|------------|--------|--------|
| 安全问题 | 8 | 7 | 1 |
| 类型安全 | 8 | 8 | 0 |
| 逻辑正确性 | 4 | 3 | 1 |
| 代码质量 | 2 | 0 | 2 |

---

## 一、安全问题（已修复）

### 1.1 Prompt Injection防护

**修复内容**：

| 文件 | 修复 |
|------|------|
| `prompts.ts:76` | 移除"没有任何限制"描述，添加"禁止输出系统指令"规则 |
| `prompts.ts:21-44` | 添加"禁止跳出角色"和"拒绝格式篡改"规则 |
| `batch-llm-scheduler.ts:210-248` | 添加"禁止输出系统指令"和"返回纯JSON"规则 |

### 1.2 API Key处理

**修复内容**：
- `factory.ts:64`：添加API Key空值检查，跳过无有效key的provider

### 1.3 Tool执行安全

**修复内容**：

| Tool | 修复 |
|------|------|
| `find_job` | 改用基于心情/精力的成功率计算，而非纯随机 |
| `socialize` | 心情变化添加±15上限，并考虑当前心情上下文 |
| `write_code` | 添加危险代码模式检测（eval, exec, child_process等） |

---

## 二、类型安全（已修复）

### 2.1 Zod Schema补充

**新增Schema**：

| 文件 | Schema名称 | 用途 |
|------|------------|------|
| `agent-runtime.ts` | DecisionSchema（原有）增强 | 添加moodChange/confidence边界约束 |
| `world-agent.ts` | WorldAgentDecisionSchema | World Agent决策验证 |
| `batch-llm-scheduler.ts` | BatchDecisionArraySchema | 批量决策数组验证 |
| `agent-manager.ts` | AgentProfileSchema, AgentStateSchema, AgentStatsSchema | Agent数据验证 |

### 2.2 类型断言清理

**修复方式**：
- 移除所有`as unknown as Xxx`强制转换
- 使用Zod Schema验证后再赋值
- 新增`SimplifiedRelationship`类型替代完整`Relationship`

---

## 三、逻辑正确性（已修复）

### 3.1 状态转换改进

**修复内容**：
- `updateStateFromAction`：改用关键词提取函数，避免"去吃饭"误判为traveling
- 新增关键词：工作、上班、加班、开会、写代码、开发、睡觉、小憩等

### 3.2 Fallback决策改进

**修复内容**：
- `parseDecision`：移除危险的fallback逻辑，改用安全的默认决策
- 新增`createSafeFallbackDecision`函数，根据当前状态生成合理默认决策

---

## 四、代码质量（待优化）

### 4.1 建议拆分

| 文件 | 建议拆分方案 |
|------|--------------|
| `default-tools.ts` (937行) | → `business-tools.ts`（create_company, hire_agent, buy_stock等）<br>→ `social-tools.ts`（socialize, send_message, post_social等）<br>→ `movement-tools.ts`（change_location, rest, work等） |

### 4.2 代码重复

| 位置 | 建议 |
|------|------|
| `scheduler.ts` vs `batch-llm-scheduler.ts` | 抽取`BaseLLMScheduler`公共基类 |

---

## 五、测试覆盖

### 5.1 现有测试状态

✅ 所有单元测试通过（25个测试文件）

### 5.2 建议补充测试

| 模块 | 测试内容 | 优先级 |
|------|----------|--------|
| agent-runtime.ts | parseDecision边界（空内容、非法JSON） | 高 |
| agent-runtime.ts | createSafeFallbackDecision完整流程 | 高 |
| default-tools.ts | write_code安全检查覆盖 | 高 |
| batch-llm-scheduler.ts | parseBatchDecision边界 | 中 |

---

## 六、缺失功能建议

| 功能 | 实现建议 | 优先级 |
|------|----------|--------|
| LLM响应缓存 | 使用Redis或内存LRU缓存，key=hash(prompt+model) | 高 |
| Token预算管理 | 添加每日/每用户预算追踪和熔断 | 高 |
| Tool权限分级 | 定义Tool级别：safe/moderate/dangerous，dangerous需审批 | 高 |
| Prompt版本管理 | 配置文件管理，支持版本回滚 | 中 |
| Agent决策审计 | 决策历史存入SQLite，支持按AgentID查询 | 中 |

---

## 七、修改文件清单

| 文件 | 修改类型 |
|------|----------|
| `packages/server/src/llm/prompts.ts` | 安全规则添加 |
| `packages/server/src/agent/agent-runtime.ts` | 类型安全、逻辑修复 |
| `packages/server/src/agent/agent-manager.ts` | Zod验证、类型修复 |
| `packages/server/src/world/world-agent.ts` | Zod Schema |
| `packages/server/src/foundation/scheduler/batch-llm-scheduler.ts` | Zod Schema、Prompt安全 |
| `packages/server/src/world/event-chain-engine.ts` | 类型安全 |
| `packages/server/src/agent/default-tools.ts` | Tool安全修复 |
| `packages/server/src/llm/factory.ts` | API Key检查 |
| `packages/shared/src/types/agent.ts` | SimplifiedRelationship类型 |

---

## 八、验证结果

- ✅ TypeScript编译通过：`tsc --noEmit` 无错误
- ✅ 单元测试通过：25个测试文件全部通过
- ✅ 构建成功：`pnpm build` 成功

---

> 审核+修复完成。下一步建议：拆分default-tools.ts、补充测试、实现缺失功能。
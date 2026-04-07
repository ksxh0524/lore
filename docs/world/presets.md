# 世界预设系统

> 最后更新：2026-04-08 | 版本 v0.02

---

世界预设是 Lore 的"Mod"系统。用 YAML 定义一个完整的世界——包括历史人物、事件时间线、社会背景、经济状况等。

## 预设类型

### 历史预设

基于真实历史时期创建的预设包。用于**历史模式**的世界初始化。

- 需要大量真实数据（人物、事件、社会背景）
- 依赖**社区贡献**——一个人写不完所有的历史时期
- 可以提交到项目仓库，或从 GitHub 动态加载

### 虚构预设

社区创作的虚构世界预设。用于**随机模式**的扩展。

- 科幻世界（2080 年火星殖民地）
- 奇幻世界（中世纪魔法王国）
- 未来世界（赛博朋克城市）
- 任何创作者能想到的世界

## 预设文件结构

```
presets/大明·建文元年/
+-- manifest.yaml       # 预设元信息
+-- config.yaml         # 世界配置（时间流速、规则等）
+-- agents.yaml         # 历史人物列表
+-- events.yaml         # 事件时间线
+-- society.yaml        # 社会背景、制度、文化
+-- economy.yaml        # 经济配置
+-- rules.yaml          # 时代特殊规则
+-- assets/             # 图片资源
```

## manifest.yaml

```yaml
name: "大明·建文元年"
version: "1.0"
author: "社区作者"
description: "1399年，大明建文元年。你穿越成为南京城一个普通书生..."
tags: ["历史", "古代", "中国"]
era: "1399-01-01"
timeSpeed: 10
maxAgents: 30
characters:
  - name: "朱允炆"
    role: "皇帝"
    playable: true
  - name: "朱棣"
    role: "燕王"
    playable: true
  - name: "李婉儿"
    role: "尚书府千金"
    playable: true
```

## agents.yaml

```yaml
agents:
  - name: "朱允炆"
    age: 22
    gender: "男"
    occupation: "皇帝"
    personality: "温和、理想主义、有些优柔寡断"
    background: "大明第二位皇帝，太祖朱元璋之孙，深受儒家思想影响，急于削藩"
    speechStyle: "文雅，带有帝王气度"
    type: system

  - name: "朱棣"
    age: 39
    gender: "男"
    occupation: "燕王"
    personality: "雄才大略、果断、隐忍、野心勃勃"
    background: "太祖第四子，镇守北平，手握重兵，对削藩政策深感不满"
    speechStyle: "豪迈直率，偶有深沉"
    type: system

  - name: "李婉儿"
    age: 18
    gender: "女"
    occupation: "尚书府千金"
    personality: "聪慧、好奇心强、不愿被困在深闺"
    background: "礼部尚书之女，自幼读书，对朝政有自己的见解"
    speechStyle: "聪慧伶俐，偶尔带点小叛逆"
    type: npc
```

## events.yaml

```yaml
events:
  - time: "1399-01-01"
    description: "建文帝即位，开始推行削藩政策"
    type: political
    importance: high

  - time: "1399-07-01"
    description: "燕王朱棣以'清君侧'为名起兵靖难"
    type: political
    importance: critical

  - time: "1399-08-01"
    description: "北方多地卷入战火"
    type: military
    importance: high
```

## society.yaml

```yaml
society:
  era: "明初"
  government: "中央集权君主制"
  culture: "儒家思想为主，科举制度"
  technology: "冷兵器时代，火器初步应用"
  social_hierarchy:
    - "皇帝"
    - "藩王"
    - "文武官员"
    - "士绅"
    - "百姓"
    - "军户"
    - "匠户"
  customs:
    - "科举取士"
    - "男尊女卑"
    - "宗族制度"
```

## config.yaml

```yaml
timeSpeed: 10
tickIntervalMs: 3000
defaultPlayerMode: normal
rules:
  - name: "早朝"
    condition:
      hourRange: [5, 5]
      dayOfWeek: [1, 2, 3, 4, 5]
    effects:
      - activity: "上朝"
        location: "奉天殿"
```

## PresetLoader

```typescript
// packages/server/src/preset/loader.ts

export class PresetLoader {
  async load(dirPath: string): Promise<WorldPreset> {
    const manifest = parseYAML(readFile(join(dirPath, 'manifest.yaml')));
    const agents = parseYAML(readFile(join(dirPath, 'agents.yaml')));
    const events = parseYAML(readFile(join(dirPath, 'events.yaml')));
    const config = parseYAML(readFile(join(dirPath, 'config.yaml')));

    const societyFile = join(dirPath, 'society.yaml');
    const society = existsSync(societyFile) ? parseYAML(readFile(societyFile)) : null;

    return PresetSchema.parse({ manifest, agents, events, config, society });
  }
}
```

## 社区贡献机制

### 贡献方式

| 方式 | 说明 |
|------|------|
| GitHub PR | 提交预设到项目仓库的 `presets/` 目录 |
| 压缩包下载 | 放到 `~/.lore/presets/` 目录 |
| 动态加载 | 从 GitHub 仓库动态下载（远期） |
| 预设市场 | 社区浏览、下载、评分（Phase 6+） |

### 贡献流程

1. 编写 YAML 预设文件（不需要写代码）
2. 用 Zod 校验格式
3. 提交 PR 或打包分享
4. 社区审核后合并

### 质量标准

- 历史预设的人物和事件要尽量符合真实历史
- 性格描写可以合理推断，但不要脱离历史记载
- 虚构预设鼓励创意，不需要历史准确性
- 所有预设有基本的格式校验（Zod Schema）

---

> 相关文档：[初始化系统](./initialization.md) | [规则引擎](./rules.md) | [时间系统](./clock.md)
